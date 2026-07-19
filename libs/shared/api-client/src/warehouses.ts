import { apiFetch } from './http';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  country: string;
  timezone: string;
  isActive: boolean;
}

interface ListWarehousesResponse {
  data: Warehouse[];
}

/** GET /warehouses -- read-only in M1, warehouses are seeded, not created via this API. */
export async function listWarehouses(): Promise<Warehouse[]> {
  const response = await apiFetch<ListWarehousesResponse>('/warehouses', { method: 'GET' });
  return response.data;
}
