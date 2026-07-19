import { apiFetch } from './http';

export interface Customer {
  id: string;
  gsCode: string;
  name: string;
  phone: string | null;
  contactPerson: string | null;
  createdAt: string;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string;
  contactPerson?: string;
  notes?: string;
}

interface ListCustomersResponse {
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
}

/** GET /customers?page=&pageSize= */
export async function listCustomers(
  page: number,
  pageSize: number,
): Promise<{ data: Customer[]; total: number }> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const response = await apiFetch<ListCustomersResponse>(`/customers?${query.toString()}`, {
    method: 'GET',
  });
  return { data: response.data, total: response.total };
}

/** POST /customers -- gsCode is server-generated, never sent by the client. */
export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  return apiFetch<Customer>('/customers', {
    method: 'POST',
    body: input,
  });
}
