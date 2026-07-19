import { Prisma } from '../../generated/client';
import type { ClsService } from 'nestjs-cls';
import { CLS_KEY_COMPANY_ID } from '../request-context';

/**
 * SECURITY-CRITICAL. This is the single control that makes cross-company data leaks structurally
 * impossible instead of merely "unlikely if every developer remembers a WHERE clause." It must
 * pass the isolation test suite (apps/api/src/iam/*.isolation.spec.ts) before this system ever
 * touches real customer data. See docs/adr/0002-orm-choice.md.
 *
 * Every model listed here gets `companyId` silently injected into every read/write. If you add a
 * new tenant-scoped model to the schema, you MUST add its (PascalCase) name here too -- forgetting
 * this is the single easiest way to reintroduce a cross-tenant leak, so the isolation test suite
 * should be extended to cover every new tenant-scoped model as it's added.
 */
const TENANT_SCOPED_MODELS = new Set(['Warehouse', 'Customer', 'CustomerSequence', 'User']);

function requireCompanyId(cls: ClsService, model: string): string {
  const companyId = cls.get<string>(CLS_KEY_COMPANY_ID);
  if (!companyId) {
    // Fail closed: a tenant-scoped model queried with no company in context is treated as a bug,
    // not "run unscoped." Seed/admin scripts must use a separate, unextended PrismaClient
    // (see prisma/seed.ts) instead of routing through this extension.
    throw new Error(
      `tenant-scope: attempted to query tenant-scoped model "${model}" with no companyId in ` +
        'request context. If this is a background job or seed script, use a plain (unextended) ' +
        'PrismaClient instead of the DI-provided extended client.',
    );
  }
  return companyId;
}

export function tenantScopeExtension(cls: ClsService) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'tenant-scope',
      query: {
        $allModels: {
          async findMany({ model, args, query }) {
            if (!TENANT_SCOPED_MODELS.has(model)) return query(args);
            const companyId = requireCompanyId(cls, model);
            args.where = { ...args.where, companyId };
            return query(args);
          },
          async findFirst({ model, args, query }) {
            if (!TENANT_SCOPED_MODELS.has(model)) return query(args);
            const companyId = requireCompanyId(cls, model);
            args.where = { ...args.where, companyId };
            return query(args);
          },
          async findUnique({ model, args, query }) {
            if (!TENANT_SCOPED_MODELS.has(model)) return query(args);
            const companyId = requireCompanyId(cls, model);
            // findUnique's `where` may only contain fields from a unique index, so companyId
            // usually can't be merged directly into it. Fetch by the unique key as normal, then
            // verify the row belongs to this tenant before returning it -- a mismatch is treated
            // identically to "not found" so no cross-tenant existence is ever leaked.
            const result = await query(args);
            if (result && (result as Record<string, unknown>).companyId !== companyId) {
              return null;
            }
            return result;
          },
          async count({ model, args, query }) {
            if (!TENANT_SCOPED_MODELS.has(model)) return query(args);
            const companyId = requireCompanyId(cls, model);
            args.where = { ...args.where, companyId };
            return query(args);
          },
          async update({ model, args, query }) {
            if (!TENANT_SCOPED_MODELS.has(model)) return query(args);
            const companyId = requireCompanyId(cls, model);
            args.where = { ...args.where, companyId };
            return query(args);
          },
          async updateMany({ model, args, query }) {
            if (!TENANT_SCOPED_MODELS.has(model)) return query(args);
            const companyId = requireCompanyId(cls, model);
            args.where = { ...args.where, companyId };
            return query(args);
          },
          async delete({ model, args, query }) {
            if (!TENANT_SCOPED_MODELS.has(model)) return query(args);
            const companyId = requireCompanyId(cls, model);
            args.where = { ...args.where, companyId };
            return query(args);
          },
          async deleteMany({ model, args, query }) {
            if (!TENANT_SCOPED_MODELS.has(model)) return query(args);
            const companyId = requireCompanyId(cls, model);
            args.where = { ...args.where, companyId };
            return query(args);
          },
          async create({ model, args, query }) {
            if (!TENANT_SCOPED_MODELS.has(model)) return query(args);
            const companyId = requireCompanyId(cls, model);
            args.data = { ...args.data, companyId } as typeof args.data;
            return query(args);
          },
          async upsert({ model, args, query }) {
            if (!TENANT_SCOPED_MODELS.has(model)) return query(args);
            const companyId = requireCompanyId(cls, model);
            args.where = { ...args.where, companyId };
            args.create = { ...args.create, companyId } as typeof args.create;
            return query(args);
          },
        },
      },
    }),
  );
}
