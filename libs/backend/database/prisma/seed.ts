/**
 * DEV/DEMO SEED SCRIPT -- creates a single placeholder tenant with its six warehouses, the five
 * fixed roles, and one demo admin login. Idempotent: safe to run multiple times (every write is
 * either an upsert against a real unique key, or a manual find-then-create for Company, which has
 * no unique key of its own to upsert against).
 *
 * Run via "pnpm --filter @erp/backend-database run prisma:seed" (root) or
 * "pnpm run prisma:seed" (from this package), which both resolve to this package.json's
 * "prisma:seed" script: "ts-node --transpile-only prisma/seed.ts". Do not rename that script.
 *
 * Imports a fresh, UNEXTENDED PrismaClient straight from the generated output -- deliberately NOT
 * EXTENDED_PRISMA_CLIENT. Seed scripts run outside any request/CLS context, and the tenant-scope
 * extension throws if it's queried with no companyId in CLS (see
 * src/extensions/tenant-scope.extension.ts) -- exactly the case here, so this script bypasses the
 * extension entirely, same as any other background job/script would.
 */
import { PrismaClient, RoleName, WarehouseCode, WarehouseCountry } from '../generated/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Placeholder demo tenant name -- this is a dev/demo seed, not a real customer onboarding.
const SEED_COMPANY_NAME = 'GS Logistics (Demo)';

// LOCAL DEV SEED CREDENTIAL ONLY. This password is intentionally simple and publicly visible in
// source control -- it must never be reused as a real credential anywhere but a disposable local
// or CI database. Change it (or deactivate/delete this user) before any shared/public deployment.
const DEMO_ADMIN_EMAIL = 'admin@gs-erp.local';
const DEMO_ADMIN_PASSWORD = 'ChangeMe123!';

interface WarehouseSeed {
  code: WarehouseCode;
  name: string;
  country: WarehouseCountry;
  timezone: string;
}

const WAREHOUSES: WarehouseSeed[] = [
  { code: WarehouseCode.GUANGZHOU, name: 'Guangzhou', country: WarehouseCountry.CN, timezone: 'Asia/Shanghai' },
  { code: WarehouseCode.YIWU, name: 'Yiwu', country: WarehouseCountry.CN, timezone: 'Asia/Shanghai' },
  { code: WarehouseCode.URUMQI, name: 'Urumqi', country: WarehouseCountry.CN, timezone: 'Asia/Shanghai' },
  { code: WarehouseCode.KASHGAR, name: 'Kashgar', country: WarehouseCountry.CN, timezone: 'Asia/Shanghai' },
  { code: WarehouseCode.ANDIJAN, name: 'Andijan', country: WarehouseCountry.UZ, timezone: 'Asia/Tashkent' },
  { code: WarehouseCode.TASHKENT, name: 'Tashkent', country: WarehouseCountry.UZ, timezone: 'Asia/Tashkent' },
];

const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  [RoleName.SUPER_ADMIN]: 'Cross-company platform administrator.',
  [RoleName.COMPANY_ADMIN]: 'Full administrative access within their own company.',
  [RoleName.LOGISTICS_MANAGER]: 'Manages logistics operations across every warehouse in their company.',
  [RoleName.WAREHOUSE_OPERATOR]: 'Operates only within explicitly assigned warehouses.',
  [RoleName.CUSTOMER]: 'External customer-portal access to their own shipments only.',
};

/**
 * Company has no unique field other than `id` (which is generated), so it can't be targeted by a
 * real Prisma `upsert`. Emulate one: reuse the existing row by name if present, otherwise create
 * it -- still idempotent across repeated runs.
 */
async function findOrCreateCompany(name: string) {
  const existing = await prisma.company.findFirst({ where: { name } });
  if (existing) {
    return existing;
  }
  return prisma.company.create({
    data: {
      name,
      legalName: `${name} LLC`,
      timezone: 'Asia/Tashkent',
    },
  });
}

async function seedWarehouses(companyId: string): Promise<number> {
  for (const warehouse of WAREHOUSES) {
    await prisma.warehouse.upsert({
      where: { companyId_code: { companyId, code: warehouse.code } },
      update: {
        name: warehouse.name,
        country: warehouse.country,
        timezone: warehouse.timezone,
      },
      create: {
        companyId,
        code: warehouse.code,
        name: warehouse.name,
        country: warehouse.country,
        timezone: warehouse.timezone,
        isActive: true,
      },
    });
  }
  return WAREHOUSES.length;
}

async function seedRoles(): Promise<Record<RoleName, { id: string }>> {
  const roles = {} as Record<RoleName, { id: string }>;
  for (const name of Object.values(RoleName)) {
    roles[name] = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: ROLE_DESCRIPTIONS[name] },
    });
  }
  return roles;
}

async function seedDemoAdmin(companyId: string, companyAdminRoleId: string): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { companyId_email: { companyId, email: DEMO_ADMIN_EMAIL } },
    update: {},
    create: {
      companyId,
      email: DEMO_ADMIN_EMAIL,
      passwordHash,
      fullName: 'Demo Admin',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: companyAdminRoleId } },
    update: {},
    create: { userId: user.id, roleId: companyAdminRoleId },
  });
}

async function main(): Promise<void> {
  const company = await findOrCreateCompany(SEED_COMPANY_NAME);

  // lastSequence starts at 0 and is only ever incremented (see CustomerService.create) -- update:
  // {} on re-run so a reseed never resets progress already made against this sequence.
  await prisma.customerSequence.upsert({
    where: { companyId: company.id },
    update: {},
    create: { companyId: company.id, lastSequence: 0 },
  });

  const warehouseCount = await seedWarehouses(company.id);
  const roles = await seedRoles();
  await seedDemoAdmin(company.id, roles[RoleName.COMPANY_ADMIN].id);

  console.log('Seed complete.');
  console.log(`  Company:      ${company.name} (${company.id})`);
  console.log(`  Warehouses:   ${warehouseCount}`);
  console.log(`  Roles:        ${Object.values(RoleName).length}`);
  console.log(`  Demo admin:   ${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}  (LOCAL DEV ONLY -- do not reuse)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
