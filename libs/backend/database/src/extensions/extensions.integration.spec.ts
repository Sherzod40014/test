import { Test } from '@nestjs/testing';
import { ClsModule, ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma.service';
import { createExtendedPrismaClient, ExtendedPrismaClient } from '../extended-prisma-client';
import { CLS_KEY_COMPANY_ID } from '../request-context';

/**
 * Integration tests for the three Prisma Client Extensions in isolation, exercised directly
 * (not through HTTP) since M1 doesn't yet expose a DELETE endpoint over the API. Requires a real
 * Postgres database (pnpm docker:up && pnpm prisma:migrate) -- these are not unit tests against a
 * mock, on purpose: the whole point of this suite is proving the extensions behave correctly
 * against real Prisma query execution, which cannot be meaningfully faked.
 *
 * Run with: pnpm --filter @erp/backend-database test
 */
describe('Prisma Client Extensions (integration)', () => {
  let prisma: PrismaService;
  let cls: ClsService;
  let extended: ExtendedPrismaClient;

  let companyAId: string;
  let companyBId: string;

  const runId = Date.now().toString(36);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ClsModule.forRoot()],
      providers: [PrismaService],
    }).compile();

    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    cls = moduleRef.get(ClsService);
    extended = createExtendedPrismaClient(prisma, cls);

    const companyA = await prisma.company.create({ data: { name: `Ext Test Co A ${runId}` } });
    const companyB = await prisma.company.create({ data: { name: `Ext Test Co B ${runId}` } });
    companyAId = companyA.id;
    companyBId = companyB.id;
  });

  afterAll(async () => {
    await prisma.auditEntry.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.warehouse.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    await prisma.$disconnect();
  });

  /** Runs `fn` inside a fresh CLS context with `companyId` set -- simulates one authenticated request. */
  function runAs<T>(companyId: string, fn: () => Promise<T>): Promise<T> {
    return cls.run(() => {
      cls.set(CLS_KEY_COMPANY_ID, companyId);
      return fn();
    });
  }

  it('fails closed: throws instead of silently running unscoped when no companyId is in context', async () => {
    await expect(extended.warehouse.findMany()).rejects.toThrow(/companyId/i);
  });

  it("never returns another company's row, whether listing or fetching by id", async () => {
    const warehouseA = await runAs(companyAId, () =>
      extended.warehouse.create({
        data: { code: 'YIWU', name: 'Yiwu (isolation test A)', country: 'CN', timezone: 'Asia/Shanghai' },
      }),
    );

    const listedFromB = await runAs(companyBId, () => extended.warehouse.findMany());
    expect(listedFromB.some((w) => w.id === warehouseA.id)).toBe(false);

    const fetchedFromB = await runAs(companyBId, () =>
      extended.warehouse.findUnique({ where: { id: warehouseA.id } }),
    );
    expect(fetchedFromB).toBeNull();

    const fetchedFromA = await runAs(companyAId, () =>
      extended.warehouse.findUnique({ where: { id: warehouseA.id } }),
    );
    expect(fetchedFromA?.id).toBe(warehouseA.id);
  });

  it('rewrites delete into a soft-delete: the row survives in the database but is hidden by default', async () => {
    const warehouse = await runAs(companyAId, () =>
      extended.warehouse.create({
        data: { code: 'URUMQI', name: 'Urumqi (isolation test A)', country: 'CN', timezone: 'Asia/Shanghai' },
      }),
    );

    await runAs(companyAId, () => extended.warehouse.delete({ where: { id: warehouse.id } }));

    const rawRow = await prisma.warehouse.findUnique({ where: { id: warehouse.id } });
    expect(rawRow).not.toBeNull();
    expect(rawRow?.deletedAt).not.toBeNull();

    const hiddenByDefault = await runAs(companyAId, () =>
      extended.warehouse.findUnique({ where: { id: warehouse.id } }),
    );
    expect(hiddenByDefault).toBeNull();

    const visibleWithIncludeDeleted = await runAs(companyAId, () =>
      extended.warehouse.findFirst({ where: { id: warehouse.id, includeDeleted: true } }),
    );
    expect(visibleWithIncludeDeleted?.id).toBe(warehouse.id);
  });

  it('writes an AuditEntry for create, update, and delete on an audited model', async () => {
    const warehouse = await runAs(companyAId, () =>
      extended.warehouse.create({
        data: { code: 'KASHGAR', name: 'Kashgar (isolation test A)', country: 'CN', timezone: 'Asia/Shanghai' },
      }),
    );

    const createEntry = await prisma.auditEntry.findFirst({
      where: { entityType: 'Warehouse', entityId: warehouse.id, action: 'CREATE' },
    });
    expect(createEntry).not.toBeNull();
    expect(createEntry?.companyId).toBe(companyAId);

    await runAs(companyAId, () =>
      extended.warehouse.update({ where: { id: warehouse.id }, data: { name: 'Kashgar (renamed)' } }),
    );
    const updateEntry = await prisma.auditEntry.findFirst({
      where: { entityType: 'Warehouse', entityId: warehouse.id, action: 'UPDATE' },
    });
    expect(updateEntry).not.toBeNull();

    await runAs(companyAId, () => extended.warehouse.delete({ where: { id: warehouse.id } }));
    const deleteEntry = await prisma.auditEntry.findFirst({
      where: { entityType: 'Warehouse', entityId: warehouse.id, action: 'DELETE' },
    });
    expect(deleteEntry).not.toBeNull();
  });
});
