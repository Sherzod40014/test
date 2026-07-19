import { Prisma } from '../../generated/client';

/**
 * Models with a `deletedAt DateTime?` column. Business records are never hard-deleted -- `delete`
 * and `deleteMany` are rewritten into `update`/`updateMany` setting `deletedAt`, and every read
 * filters out rows that already have `deletedAt` set, unless the caller explicitly asks to
 * include them (see `includeDeleted` below).
 *
 * If you add `deletedAt` to a new model in the schema, add its (PascalCase) name here too.
 */
const SOFT_DELETE_MODELS = new Set(['Warehouse', 'Customer', 'User']);

/**
 * Opt-in escape hatch for the rare legitimate case of needing to see soft-deleted rows (e.g. an
 * admin "recover a deleted customer" screen). Pass it inside `where` like a normal field; the
 * extension strips it back out before the query actually runs, so Prisma is never asked to filter
 * on a field that doesn't exist in the schema.
 *   prisma.customer.findMany({ where: { includeDeleted: true } })
 */
const INCLUDE_DELETED_FLAG = 'includeDeleted';

function stripIncludeDeletedFlag(where: Record<string, unknown> | undefined): {
  where: Record<string, unknown> | undefined;
  includeDeleted: boolean;
} {
  if (!where || !(INCLUDE_DELETED_FLAG in where)) {
    return { where, includeDeleted: false };
  }
  const { [INCLUDE_DELETED_FLAG]: includeDeleted, ...rest } = where;
  return { where: rest, includeDeleted: Boolean(includeDeleted) };
}

export function softDeleteExtension() {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'soft-delete',
      query: {
        $allModels: {
          async findMany({ model, args, query }) {
            if (!SOFT_DELETE_MODELS.has(model)) return query(args);
            const { where, includeDeleted } = stripIncludeDeletedFlag(args.where);
            args.where = includeDeleted ? where : { ...where, deletedAt: null };
            return query(args);
          },
          async findFirst({ model, args, query }) {
            if (!SOFT_DELETE_MODELS.has(model)) return query(args);
            const { where, includeDeleted } = stripIncludeDeletedFlag(args.where);
            args.where = includeDeleted ? where : { ...where, deletedAt: null };
            return query(args);
          },
          async findUnique({ model, args, query }) {
            if (!SOFT_DELETE_MODELS.has(model)) return query(args);
            // findUnique's where can't be filtered by deletedAt (unique-index restriction, same
            // reasoning as tenant-scope) -- fetch by key, then hide it if it's soft-deleted.
            const result = await query(args);
            if (result && (result as Record<string, unknown>).deletedAt !== null) {
              return null;
            }
            return result;
          },
          async count({ model, args, query }) {
            if (!SOFT_DELETE_MODELS.has(model)) return query(args);
            const { where, includeDeleted } = stripIncludeDeletedFlag(args.where);
            args.where = includeDeleted ? where : { ...where, deletedAt: null };
            return query(args);
          },
          async delete({ model, args, query }) {
            if (!SOFT_DELETE_MODELS.has(model)) return query(args);
            // Rewrite delete -> update(deletedAt: now). `query` here is bypassed on purpose: we
            // deliberately do NOT call it, since calling it would issue a real DELETE.
            const modelKey = (model.charAt(0).toLowerCase() + model.slice(1)) as keyof typeof client;
            return (client[modelKey] as { update: Function }).update({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          },
          async deleteMany({ model, args, query }) {
            if (!SOFT_DELETE_MODELS.has(model)) return query(args);
            const modelKey = (model.charAt(0).toLowerCase() + model.slice(1)) as keyof typeof client;
            return (client[modelKey] as { updateMany: Function }).updateMany({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          },
        },
      },
    }),
  );
}
