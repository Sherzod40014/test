export type Currency = 'USD' | 'CNY' | 'UZS';

export type WarehouseCode =
  | 'GUANGZHOU'
  | 'YIWU'
  | 'URUMQI'
  | 'KASHGAR'
  | 'ANDIJAN'
  | 'TASHKENT';

export const WAREHOUSE_COUNTRY: Record<WarehouseCode, 'CN' | 'UZ'> = {
  GUANGZHOU: 'CN',
  YIWU: 'CN',
  URUMQI: 'CN',
  KASHGAR: 'CN',
  ANDIJAN: 'UZ',
  TASHKENT: 'UZ',
};
