/**
 * The shape of per-request state stored in nestjs-cls (AsyncLocalStorage), and the exact keys
 * used to store it. The Prisma Client Extensions in ./extensions read these keys; the IAM
 * module's auth guard (apps/api/src/iam) is responsible for WRITING them once a request's JWT
 * has been verified. Both sides must agree on these key names -- that agreement is this file.
 */
export interface RequestContext {
  companyId: string;
  userId: string;
  /** true for SUPER_ADMIN / COMPANY_ADMIN / LOGISTICS_MANAGER -- bypasses per-warehouse checks. */
  hasAllWarehouseAccess: boolean;
  /** Ignored when hasAllWarehouseAccess is true. Populated from UserWarehouseAccess rows. */
  warehouseIds: string[];
}

export const CLS_KEY_COMPANY_ID = 'companyId';
export const CLS_KEY_USER_ID = 'userId';
export const CLS_KEY_HAS_ALL_WAREHOUSE_ACCESS = 'hasAllWarehouseAccess';
export const CLS_KEY_WAREHOUSE_IDS = 'warehouseIds';
