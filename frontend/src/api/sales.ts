import { API_ENDPOINTS } from '../config/endpoints'
import type { SaleCreatePayload } from '../types/sale'
import { apiGet, apiPost } from './client'

/** Matches backend `SaleListRow`. */
export type SaleListRow = {
  id: number
  customer_id: number | null
  payment_method: string
  discount: string | number
  subtotal: string | number
  total: string | number
  notes: string
  cash_register_session_id: number | null
  created_at: string
  items_count: number
}

export type ListSalesParams = {
  customer_id?: number
  payment_method?: string
  created_from?: string
  created_to?: string
  skip?: number
  limit?: number
}

export function buildSalesListUrl(params: ListSalesParams = {}): string {
  const sp = new URLSearchParams()
  if (params.customer_id != null) sp.set('customer_id', String(params.customer_id))
  if (params.payment_method) sp.set('payment_method', params.payment_method)
  if (params.created_from) sp.set('created_from', params.created_from)
  if (params.created_to) sp.set('created_to', params.created_to)
  if (params.skip != null) sp.set('skip', String(params.skip))
  if (params.limit != null) sp.set('limit', String(params.limit))
  const qs = sp.toString()
  return qs ? `${API_ENDPOINTS.sales.list}?${qs}` : API_ENDPOINTS.sales.list
}

export async function listSalesApi(params: ListSalesParams = {}): Promise<SaleListRow[]> {
  return apiGet<SaleListRow[]>(buildSalesListUrl(params))
}

/** Matches backend `SalesTodaySummary`. */
export type SalesTodaySummary = {
  gross_total: string | number
  transaction_count: number
  business_date: string
}

/** Matches backend `SaleItemResponse`. */
export type SaleItemResponse = {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: string | number
  line_subtotal: string | number
}

/** Matches backend `SaleResponse`. */
export type SaleResponse = {
  id: number
  customer_id: number | null
  customer: { id: number; name: string; phone: string } | null
  payment_method: string
  discount: string | number
  subtotal: string | number
  total: string | number
  notes: string
  cash_register_session_id: number | null
  created_at: string
  items: SaleItemResponse[]
}

export async function createSale(payload: SaleCreatePayload): Promise<SaleResponse> {
  return apiPost<SaleResponse>(API_ENDPOINTS.sales.list, payload)
}

export async function getSalesToday(): Promise<SalesTodaySummary> {
  return apiGet<SalesTodaySummary>(API_ENDPOINTS.sales.today)
}
