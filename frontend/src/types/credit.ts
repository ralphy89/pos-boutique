import type { CustomerStatus } from './customer'

/** Debtor row for credits UI (from GET /credit/debtors or derived from customer detail). */
export type DebtorSummary = {
  customerId: number
  name: string
  phone: string
  status: CustomerStatus
  creditLimit: number | null
  debtBalance: number
}

export type LedgerEntry = {
  id: string
  at: string
  kind: 'credit_sale' | 'payment' | 'note'
  label: string
  detail: string
  deltaDebt?: number
  amount?: number
}
