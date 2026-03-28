import { API_ENDPOINTS } from '../config/endpoints'
import type {
  CustomerCreatePayload,
  CustomerDetailResponse,
  CustomerResponse,
  CustomerUpdatePayload,
} from '../types/customer'
import { apiGet, apiPost, apiPut } from './client'

export type ListCustomersParams = {
  q?: string
  skip?: number
  limit?: number
}

export function buildCustomersListUrl(params: ListCustomersParams = {}): string {
  const sp = new URLSearchParams()
  const q = params.q?.trim()
  if (q) sp.set('q', q)
  if (params.skip != null) sp.set('skip', String(params.skip))
  if (params.limit != null) sp.set('limit', String(params.limit))
  const qs = sp.toString()
  return qs ? `${API_ENDPOINTS.customers.list}?${qs}` : API_ENDPOINTS.customers.list
}

export async function listCustomersApi(params: ListCustomersParams = {}): Promise<CustomerResponse[]> {
  return apiGet<CustomerResponse[]>(buildCustomersListUrl(params))
}

export type GetCustomerParams = {
  /** Backend query `purchase_history_limit` (default 5). */
  purchaseHistoryLimit?: number
}

export async function getCustomerApi(
  id: number,
  params: GetCustomerParams = {},
): Promise<CustomerDetailResponse> {
  const sp = new URLSearchParams()
  if (params.purchaseHistoryLimit != null) {
    sp.set('purchase_history_limit', String(params.purchaseHistoryLimit))
  }
  const qs = sp.toString()
  const url = qs ? `${API_ENDPOINTS.customers.one(id)}?${qs}` : API_ENDPOINTS.customers.one(id)
  return apiGet<CustomerDetailResponse>(url)
}

export async function createCustomerApi(payload: CustomerCreatePayload): Promise<CustomerResponse> {
  return apiPost<CustomerResponse>(API_ENDPOINTS.customers.list, payload)
}

export async function updateCustomerApi(
  id: number,
  payload: CustomerUpdatePayload,
): Promise<CustomerResponse> {
  return apiPut<CustomerResponse>(API_ENDPOINTS.customers.one(id), payload)
}
