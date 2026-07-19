import type { ClsService } from 'nestjs-cls';
import type { PrismaService } from './prisma.service';
import { tenantScopeExtension } from './extensions/tenant-scope.extension';
import { softDeleteExtension } from './extensions/soft-delete.extension';
import { auditLogExtension } from './extensions/audit-log.extension';

/**
 * Order matters: tenant-scope must run before soft-delete (both inject into `where`, and either
 * order is actually safe here since they touch disjoint concerns -- companyId vs deletedAt -- but
 * audit-log MUST be applied last so it observes the fully-scoped `args` and only fires after the
 * real, scoped write has already succeeded).
 */
export function createExtendedPrismaClient(prisma: PrismaService, cls: ClsService) {
  return prisma
    .$extends(tenantScopeExtension(cls))
    .$extends(softDeleteExtension())
    .$extends(auditLogExtension(cls));
}

export type ExtendedPrismaClient = ReturnType<typeof createExtendedPrismaClient>;

export const EXTENDED_PRISMA_CLIENT = Symbol('EXTENDED_PRISMA_CLIENT');
