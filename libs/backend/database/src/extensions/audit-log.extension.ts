import { Prisma } from '../../generated/client';
import type { ClsService } from 'nestjs-cls';
import { CLS_KEY_COMPANY_ID, CLS_KEY_USER_ID } from '../request-context';

/**
 * Writes an AuditEntry row for every create/update/delete against a business model, inside the
 * same call as the write itself (Prisma Client Extensions run in-process, not as a separate
 * transaction -- if the write throws, the audit write never happens, and vice versa can't occur
 * since the audit write only fires after `query(args)` resolves).
 *
 * KNOWN SIMPLIFICATION: `changedFields` records what was *submitted* (`args.data` for
 * create/update), not a true before/after diff -- computing a real diff would require an extra
 * read of the prior row before every write, which was judged not worth the added DB round-trip
 * for M1. If a true diff is needed later (e.g. for a "what exactly changed" audit viewer in M9),
 * add a pre-read here.
 *
 * AuditEntry itself is deliberately excluded from every check below -- without that guard, the
 * write this extension performs to record an audit entry would itself trigger this same
 * extension and recurse forever.
 */
const AUDITED_MODELS = new Set(['Warehouse', 'Customer', 'User']);

export function auditLogExtension(cls: ClsService) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'audit-log',
      query: {
        $allModels: {
          async create({ model, args, query }) {
            const result = await query(args);
            if (AUDITED_MODELS.has(model)) {
              await writeAuditEntry(client, cls, model, (result as { id?: string })?.id, 'CREATE', args.data);
            }
            return result;
          },
          async update({ model, args, query }) {
            const result = await query(args);
            if (AUDITED_MODELS.has(model)) {
              await writeAuditEntry(client, cls, model, (result as { id?: string })?.id, 'UPDATE', args.data);
            }
            return result;
          },
          async delete({ model, args, query }) {
            const result = await query(args);
            if (AUDITED_MODELS.has(model)) {
              await writeAuditEntry(
                client,
                cls,
                model,
                (result as { id?: string })?.id,
                'DELETE',
                undefined,
              );
            }
            return result;
          },
        },
      },
    }),
  );
}

async function writeAuditEntry(
  client: { auditEntry: { create: (args: unknown) => Promise<unknown> } },
  cls: ClsService,
  entityType: string,
  entityId: string | undefined,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  changedFields: unknown,
): Promise<void> {
  if (!entityId) return; // nothing meaningful to attribute the entry to
  await client.auditEntry.create({
    data: {
      companyId: cls.get<string>(CLS_KEY_COMPANY_ID) ?? null,
      actorUserId: cls.get<string>(CLS_KEY_USER_ID) ?? null,
      entityType,
      entityId,
      action,
      changedFields: changedFields ? (changedFields as Prisma.InputJsonValue) : undefined,
    },
  });
}
