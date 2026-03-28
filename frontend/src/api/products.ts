import { API_ENDPOINTS } from '../config/endpoints'
import type { ProductCreatePayload, ProductResponse } from '../types/product'
import { apiDelete, apiGet, apiPost, apiPut } from './client'

export type ListProductsParams = {
  q?: string
  /** Exact category match; omit for all. */
  category?: string
  low_stock?: boolean
  skip?: number
  limit?: number
}

export function buildProductsListUrl(params: ListProductsParams = {}): string {
  const sp = new URLSearchParams()
  const q = params.q?.trim()
  if (q) sp.set('q', q)
  if (params.category) sp.set('category', params.category)
  if (params.low_stock) sp.set('low_stock', 'true')
  if (params.skip != null) sp.set('skip', String(params.skip))
  if (params.limit != null) sp.set('limit', String(params.limit))
  const qs = sp.toString()
  return qs ? `${API_ENDPOINTS.products.list}?${qs}` : API_ENDPOINTS.products.list
}

export async function listProducts(params: ListProductsParams = {}): Promise<ProductResponse[]> {
  return apiGet<ProductResponse[]>(buildProductsListUrl(params))
}

export async function createProduct(payload: ProductCreatePayload): Promise<ProductResponse> {
  return apiPost<ProductResponse>(API_ENDPOINTS.products.list, payload)
}

export async function getProduct(id: number): Promise<ProductResponse> {
  return apiGet<ProductResponse>(API_ENDPOINTS.products.one(id))
}

/** Full field update (matches backend `ProductUpdate` with all keys set). */
export async function updateProduct(
  id: number,
  payload: ProductCreatePayload,
): Promise<ProductResponse> {
  return apiPut<ProductResponse>(API_ENDPOINTS.products.one(id), payload)
}

export async function deleteProduct(id: number): Promise<void> {
  return apiDelete(API_ENDPOINTS.products.one(id))
}
