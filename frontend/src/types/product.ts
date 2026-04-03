/** Matches backend `ProductResponse` JSON (FastAPI / Pydantic). */
export type ProductResponse = {
  id: number
  name: string
  category: string | null
  purchase_price: string | number
  sale_price: string | number
  stock: number
  min_stock: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export function moneyFromApi(value: string | number | null | undefined): number {
  if (value == null) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

/** Matches backend `ProductCreate` payload (JSON). */
export type ProductCreatePayload = {
  name: string
  category: string | null
  purchase_price: number
  sale_price: number
  stock: number
  min_stock: number
  status: 'active' | 'inactive'
}
