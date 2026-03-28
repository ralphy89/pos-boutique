import { API_ENDPOINTS } from '../config/endpoints'
import type { SaleCreatePayload } from '../types/sale'
import { apiPost } from './client'

/** Response shape from `POST /sales` (subset used by the UI). */
export type SaleResponse = {
  id: number
  customer_id: number | null
  payment_method: string
  discount: string | number
  subtotal: string | number
  total: string | number
  notes: string
  items: unknown[]
}

export async function createSale(payload: SaleCreatePayload): Promise<SaleResponse> {
  return apiPost<SaleResponse>(API_ENDPOINTS.sales.list, payload)
}
