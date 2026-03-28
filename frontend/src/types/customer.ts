export type CustomerStatus = 'active' | 'inactive' | 'watch'

export type PurchaseRow = {
  id: string
  date: string
  amount: number
  reference: string
  channel: 'counter' | 'delivery' | 'phone'
}

export type DebtRow = {
  id: string
  date: string
  type: 'charge' | 'payment' | 'adjustment'
  amount: number
  note?: string
}

export type ActivityRow = {
  id: string
  date: string
  label: string
}

/** Aggregates from GET /customers/:id when provided by the API. */
export type CustomerLedgerStats = {
  totalPurchase: number
  amountPaid: number
  currentDebt: number
}

/** View model: API customer plus optional local ledger fields (empty until sales/credit APIs exist). */
export type CustomerRecord = {
  id: number
  name: string
  phone: string
  address: string
  note: string
  creditLimit: number | null
  status: CustomerStatus
  purchases: PurchaseRow[]
  debtLedger: DebtRow[]
  activities: ActivityRow[]
  createdAt: string
  updatedAt: string
  /** Present when loaded from customer detail endpoint (server-backed totals). */
  ledgerStats?: CustomerLedgerStats
}

export type CustomerMetrics = {
  totalPurchases: number
  currentDebt: number
  amountPaid: number
  lastPurchaseDate: string | null
  lastActivityDate: string | null
}

/** Matches backend `CustomerResponse` JSON (FastAPI / Pydantic). */
export type CustomerResponse = {
  id: number
  name: string
  phone: string
  address: string
  note: string
  credit_limit: string | number | null
  status: CustomerStatus
  created_at: string
  updated_at: string
}

/** Matches backend `CustomerPurchaseHistoryItem`. */
export type CustomerPurchaseHistoryItem = {
  sale_id: number
  total: string | number
  subtotal: string | number
  discount: string | number
  payment_method: string
  items_count: number
  created_at: string
}

/** Matches backend `CustomerDetailResponse` (GET /customers/{id}). */
export type CustomerDetailResponse = CustomerResponse & {
  debt_balance: string | number
  total_purchase: string | number
  amount_paid: string | number
  recent_purchases: CustomerPurchaseHistoryItem[]
}

export type CustomerCreatePayload = {
  name: string
  phone: string
  address: string
  note: string
  credit_limit: number | null
  status: CustomerStatus
}

export type CustomerUpdatePayload = CustomerCreatePayload

export function creditLimitFromApi(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? round2(value) : null
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? round2(n) : null
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}
