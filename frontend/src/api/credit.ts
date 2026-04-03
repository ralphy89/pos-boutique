import { API_ENDPOINTS } from '../config/endpoints'
import type { CustomerStatus } from '../types/customer'
import { apiGet, apiPost } from './client'

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

/** Tolerate camelCase or missing fields from proxies / older servers. */
export function normalizeCreditSummary(raw: unknown): CreditSummaryResponse {
  if (!isRecord(raw)) return { total_outstanding: 0, debtor_count: 0 }
  const to = raw.total_outstanding ?? raw.totalOutstanding ?? 0
  const dc = Number(raw.debtor_count ?? raw.debtorCount ?? 0)
  return {
    total_outstanding: typeof to === 'number' || typeof to === 'string' ? to : 0,
    debtor_count: Number.isFinite(dc) ? dc : 0,
  }
}

export function normalizeDebtorRows(raw: unknown): CreditDebtorRow[] {
  if (!Array.isArray(raw)) return []
  const out: CreditDebtorRow[] = []
  for (const item of raw) {
    if (!isRecord(item)) continue
    const id = Number(item.id)
    if (!Number.isFinite(id) || id < 1) continue
    const name = String(item.name ?? '')
    const phone = String(item.phone ?? '')
    const debt = item.debt_balance ?? item.debtBalance ?? 0
    const cl = item.credit_limit ?? item.creditLimit
    const status = (item.status ?? 'active') as CustomerStatus
    out.push({
      id,
      name,
      phone,
      debt_balance: typeof debt === 'number' || typeof debt === 'string' ? debt : 0,
      credit_limit:
        cl === null || cl === undefined || cl === '' ? null : (cl as string | number),
      status,
    })
  }
  return out
}

export function normalizeCreditPaymentRows(raw: unknown): CreditPaymentListItem[] {
  if (!Array.isArray(raw)) return []
  const out: CreditPaymentListItem[] = []
  for (const item of raw) {
    if (!isRecord(item)) continue
    const id = Number(item.id)
    const customer_id = Number(item.customer_id ?? item.customerId)
    if (!Number.isFinite(id) || !Number.isFinite(customer_id)) continue
    out.push({
      id,
      customer_id,
      customer_name: String(item.customer_name ?? item.customerName ?? ''),
      amount: (item.amount ?? 0) as string | number,
      payment_method: String(item.payment_method ?? item.paymentMethod ?? ''),
      note: String(item.note ?? ''),
      balance_after: (item.balance_after ?? item.balanceAfter ?? 0) as string | number,
      cash_register_session_id: (() => {
        const raw = item.cash_register_session_id ?? item.cashRegisterSessionId
        if (raw == null) return null
        const n = Number(raw)
        return Number.isFinite(n) && n >= 1 ? n : null
      })(),
      created_at: String(item.created_at ?? item.createdAt ?? ''),
    })
  }
  return out
}

export type CreditSummaryResponse = {
  total_outstanding: string | number
  debtor_count: number
}

export type CreditDebtorRow = {
  id: number
  name: string
  phone: string
  debt_balance: string | number
  credit_limit: string | number | null
  status: CustomerStatus
}

export type CreditPaymentListItem = {
  id: number
  customer_id: number
  customer_name: string
  amount: string | number
  payment_method: string
  note: string
  balance_after: string | number
  cash_register_session_id: number | null
  created_at: string
}

export type CreditLedgerEntryApi = {
  kind: 'charge' | 'payment'
  record_id: number
  created_at: string
  amount: string | number
  balance_after: string | number
  sale_id: number | null
  payment_method: string | null
  note: string | null
}

export type CustomerCreditLedgerResponse = {
  customer_id: number
  entries: CreditLedgerEntryApi[]
}

export type CreditPaymentCreatePayload = {
  customer_id: number
  amount: string
  payment_method: 'cash' | 'moncash' | 'transfer'
  note: string
  cash_register_session_id: number | null
}

export type CreditPaymentResponse = Omit<CreditPaymentListItem, 'customer_name'>

export function buildCreditPaymentsListUrl(params: { skip?: number; limit?: number } = {}): string {
  const sp = new URLSearchParams()
  if (params.skip != null) sp.set('skip', String(params.skip))
  if (params.limit != null) sp.set('limit', String(params.limit))
  const qs = sp.toString()
  return qs ? `${API_ENDPOINTS.credit.payments}?${qs}` : API_ENDPOINTS.credit.payments
}

export async function getCreditSummaryApi(): Promise<CreditSummaryResponse> {
  const raw = await apiGet<unknown>(API_ENDPOINTS.credit.summary)
  return normalizeCreditSummary(raw)
}

export async function listCreditDebtorsApi(): Promise<CreditDebtorRow[]> {
  const raw = await apiGet<unknown>(API_ENDPOINTS.credit.debtors)
  return normalizeDebtorRows(raw)
}

export async function listCreditPaymentsApi(params: {
  skip?: number
  limit?: number
} = {}): Promise<CreditPaymentListItem[]> {
  const raw = await apiGet<unknown>(buildCreditPaymentsListUrl(params))
  return normalizeCreditPaymentRows(raw)
}

export async function getCustomerCreditLedgerApi(customerId: number): Promise<CustomerCreditLedgerResponse> {
  return apiGet<CustomerCreditLedgerResponse>(API_ENDPOINTS.credit.ledger(customerId))
}

export async function createCreditPaymentApi(body: CreditPaymentCreatePayload): Promise<CreditPaymentResponse> {
  return apiPost<CreditPaymentResponse>(API_ENDPOINTS.credit.payments, body)
}
