import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { PrismaService } from '@erp/backend-database';
import { AppModule } from '../src/app.module';
import { hashPassword } from '../src/iam/password.util';

/**
 * SECURITY-CRITICAL. This is the test the whole tenant-isolation design (see
 * docs/adr/0002-orm-choice.md and libs/backend/database/src/extensions/tenant-scope.extension.ts)
 * lives or dies by. It must be run -- and pass -- against a real Postgres database before this
 * system ever touches real customer data:
 *
 *   pnpm docker:up && pnpm prisma:migrate && pnpm --filter @erp/api test:e2e
 *
 * It creates two throwaway companies ("Company A" / "Company B"), each with their own warehouse,
 * admin user, and customer, then asserts -- entirely through the public HTTP API, the same way a
 * real attacker or a real bug would be exercised -- that Company A's authenticated user can never
 * see, list, or fetch-by-id anything belonging to Company B, and that GS Code numbering is
 * per-company (both companies' first customer gets GS001, proving the sequence itself is scoped,
 * not just the list/get endpoints).
 */
describe('Warehouse isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now().toString(36);

  let companyAId: string;
  let companyBId: string;
  let warehouseAId: string;
  let warehouseBId: string;
  let seededCustomerBId: string;
  let tokenA: string;
  let tokenB: string;

  const PASSWORD = 'IsolationTest123!';

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);

    const passwordHash = await hashPassword(PASSWORD);

    const companyA = await prisma.company.create({ data: { name: `Isolation Test Co A ${runId}` } });
    const companyB = await prisma.company.create({ data: { name: `Isolation Test Co B ${runId}` } });
    companyAId = companyA.id;
    companyBId = companyB.id;

    await prisma.customerSequence.createMany({
      data: [
        { companyId: companyAId, lastSequence: 0 },
        { companyId: companyBId, lastSequence: 0 },
      ],
    });

    const warehouseA = await prisma.warehouse.create({
      data: {
        companyId: companyAId,
        code: 'GUANGZHOU',
        name: 'Guangzhou (test A)',
        country: 'CN',
        timezone: 'Asia/Shanghai',
      },
    });
    const warehouseB = await prisma.warehouse.create({
      data: {
        companyId: companyBId,
        code: 'GUANGZHOU',
        name: 'Guangzhou (test B)',
        country: 'CN',
        timezone: 'Asia/Shanghai',
      },
    });
    warehouseAId = warehouseA.id;
    warehouseBId = warehouseB.id;

    const role = await prisma.role.upsert({
      where: { name: 'COMPANY_ADMIN' },
      update: {},
      create: { name: 'COMPANY_ADMIN' },
    });

    const userA = await prisma.user.create({
      data: {
        companyId: companyAId,
        email: `isolation-a-${runId}@test.local`,
        passwordHash,
        fullName: 'Isolation Test User A',
      },
    });
    const userB = await prisma.user.create({
      data: {
        companyId: companyBId,
        email: `isolation-b-${runId}@test.local`,
        passwordHash,
        fullName: 'Isolation Test User B',
      },
    });
    await prisma.userRole.createMany({
      data: [
        { userId: userA.id, roleId: role.id },
        { userId: userB.id, roleId: role.id },
      ],
    });

    // A pre-existing customer in Company B, used to prove Company A can never fetch it by id.
    const customerB = await prisma.customer.create({
      data: { companyId: companyBId, gsCode: `GS-SEED-${runId}`, gsSequence: 999, name: 'Seed Customer B' },
    });
    seededCustomerBId = customerB.id;

    const loginA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userA.email, password: PASSWORD })
      .expect(200);
    tokenA = loginA.body.accessToken;

    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userB.email, password: PASSWORD })
      .expect(200);
    tokenB = loginB.body.accessToken;

    expect(tokenA).toEqual(expect.any(String));
    expect(tokenB).toEqual(expect.any(String));
  });

  afterAll(async () => {
    // Best-effort cleanup of this test's own fixtures (dependency order matters -- FKs are not
    // cascading by default). Wrapped so a cleanup hiccup never masks a real assertion failure.
    try {
      await prisma.userRole.deleteMany({ where: { user: { companyId: { in: [companyAId, companyBId] } } } });
      await prisma.refreshToken.deleteMany({ where: { user: { companyId: { in: [companyAId, companyBId] } } } });
      await prisma.user.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
      await prisma.customer.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
      await prisma.customerSequence.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
      await prisma.warehouse.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
      await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    } finally {
      await app.close();
    }
  });

  it("lists only the caller's own company warehouses", async () => {
    const res = await request(app.getHttpServer())
      .get('/warehouses')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const ids = res.body.data.map((w: { id: string }) => w.id);
    expect(ids).toContain(warehouseAId);
    expect(ids).not.toContain(warehouseBId);
  });

  it("lists only the caller's own company customers", async () => {
    const res = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const ids = res.body.data.map((c: { id: string }) => c.id);
    expect(ids).not.toContain(seededCustomerBId);
  });

  it('returns 404 -- not 403, and not the record -- when fetching another company’s customer by id', async () => {
    await request(app.getHttpServer())
      .get(`/customers/${seededCustomerBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);

    // Sanity check: the SAME id, fetched with Company B's own token, does exist.
    await request(app.getHttpServer())
      .get(`/customers/${seededCustomerBId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
  });

  it('rejects requests with no token at all', async () => {
    await request(app.getHttpServer()).get('/warehouses').expect(401);
    await request(app.getHttpServer()).get('/customers').expect(401);
  });

  it('scopes GS Code numbering per company, not globally', async () => {
    const createdA1 = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'A customer one' })
      .expect(201);
    const createdA2 = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'A customer two' })
      .expect(201);
    const createdB1 = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'B customer one' })
      .expect(201);

    expect(createdA1.body.gsCode).toBe('GS001');
    expect(createdA2.body.gsCode).toBe('GS002');
    // Company B's first customer is ALSO GS001 -- proof the sequence is per-company, not global.
    expect(createdB1.body.gsCode).toBe('GS001');

    // And Company B can never see Company A's customers by listing, even after both companies
    // now have data.
    const listA = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const listB = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const gsCodesA: string[] = listA.body.data.map((c: { gsCode: string }) => c.gsCode);
    const gsCodesB: string[] = listB.body.data.map((c: { gsCode: string }) => c.gsCode);
    expect(gsCodesA).toEqual(expect.arrayContaining(['GS001', 'GS002']));
    expect(gsCodesB).toContain('GS001');
    expect(gsCodesB).not.toEqual(expect.arrayContaining(['GS002']));
    expect(listA.body.data.some((c: { id: string }) => c.id === createdB1.body.id)).toBe(false);
    expect(listB.body.data.some((c: { id: string }) => c.id === createdA1.body.id)).toBe(false);
  });
});
