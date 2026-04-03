import { API_ENDPOINTS } from '../config/endpoints'
import { apiGet, apiPost } from './client'

/** Matches backend `CashRegisterSessionSummary`. */
export type CashRegisterSessionSummary = {
  id: number
  status: string
  opened_at: string
  closed_at: string | null
  opened_by_user_id: number | null
  closed_by_user_id: number | null
  opening_balance: string | number
  closing_balance: string | number | null
  total_sales_amount: string | number
  total_expenses: string | number
  notes: string
}

export type OpenCashRegisterSessionPayload = {
  opening_balance: number
  notes?: string
}

export type CloseCashRegisterSessionPayload = {
  closing_balance: number
  notes?: string | null
}

/** Matches backend `CashRegisterPaymentBreakdown`. */
export type CashRegisterPaymentBreakdownDto = {
  cash: string | number
  moncash: string | number
  transfer: string | number
  credit: string | number
}

export type PaymentBreakdownNumbers = {
  cash: number
  moncash: number
  transfer: number
  credit: number
}

function num(v: string | number): number {
  if (typeof v === 'number') return v
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/** `GET /cash-register/sessions/current` — `null` when no session is open. */
export async function getCurrentCashRegisterSession(): Promise<CashRegisterSessionSummary | null> {
  return apiGet<CashRegisterSessionSummary | null>(API_ENDPOINTS.cashRegister.currentSession)
}

/** `POST /cash-register/sessions` — opens a new session (409 if one is already open). */
export async function openCashRegisterSession(
  payload: OpenCashRegisterSessionPayload,
): Promise<CashRegisterSessionSummary> {
  const body = {
    opening_balance: payload.opening_balance,
    notes: payload.notes?.trim() ?? '',
  }
  return apiPost<CashRegisterSessionSummary>(API_ENDPOINTS.cashRegister.sessions, body)
}

/** `POST /cash-register/sessions/{id}/close` */
export async function closeCashRegisterSession(
  sessionId: number,
  payload: CloseCashRegisterSessionPayload,
): Promise<CashRegisterSessionSummary> {
  const body = {
    closing_balance: payload.closing_balance,
    notes: payload.notes == null ? null : payload.notes.trim(),
  }
  return apiPost<CashRegisterSessionSummary>(API_ENDPOINTS.cashRegister.closeSession(sessionId), body)
}

export function summaryOpeningBalance(s: CashRegisterSessionSummary): number {
  return num(s.opening_balance)
}

export function summaryTotalSales(s: CashRegisterSessionSummary): number {
  return num(s.total_sales_amount)
}

export function summaryTotalExpenses(s: CashRegisterSessionSummary): number {
  return num(s.total_expenses)
}

export function paymentBreakdownFromApi(dto: CashRegisterPaymentBreakdownDto): PaymentBreakdownNumbers {
  return {
    cash: num(dto.cash),
    moncash: num(dto.moncash),
    transfer: num(dto.transfer),
    credit: num(dto.credit),
  }
}

/** Posted sales for this session, grouped by payment method. */
export async function getSessionPaymentBreakdown(sessionId: number): Promise<PaymentBreakdownNumbers> {
  const raw = await apiGet<CashRegisterPaymentBreakdownDto>(
    API_ENDPOINTS.cashRegister.sessionPaymentBreakdown(sessionId),
  )
  return paymentBreakdownFromApi(raw)
}

/** Same as {@link getSessionPaymentBreakdown} for the open session (404 if none). */
export async function getCurrentSessionPaymentBreakdown(): Promise<PaymentBreakdownNumbers> {
  const raw = await apiGet<CashRegisterPaymentBreakdownDto>(
    API_ENDPOINTS.cashRegister.currentSessionPaymentBreakdown,
  )
  return paymentBreakdownFromApi(raw)
}

/** Matches backend `CashRegisterExpenseResponse`. */
export type CashRegisterExpenseDto = {
  id: number
  cash_register_session_id: number
  amount: string | number
  category: string
  description: string
  recorded_at: string
  recorded_by_user_id: number | null
}

export type RegisterExpenseRow = {
  id: string
  amount: number
  note: string
  at: string
  /** Present for server-backed rows */
  category?: string
}

export function registerExpenseFromApi(e: CashRegisterExpenseDto): RegisterExpenseRow {
  return {
    id: `srv-${e.id}`,
    amount: num(e.amount),
    note: (e.description ?? '').trim() || e.category || 'Expense',
    at: e.recorded_at,
    category: e.category || undefined,
  }
}

export async function listSessionExpenses(sessionId: number): Promise<RegisterExpenseRow[]> {
  const rows = await apiGet<CashRegisterExpenseDto[]>(API_ENDPOINTS.cashRegister.sessionExpenses(sessionId))
  return rows.map(registerExpenseFromApi)
}

export type CreateSessionExpensePayload = {
  amount: number
  category?: string
  description?: string
}

export async function createSessionExpense(
  sessionId: number,
  payload: CreateSessionExpensePayload,
): Promise<RegisterExpenseRow> {
  const body = {
    amount: payload.amount,
    category: (payload.category ?? 'other').trim() || 'other',
    description: (payload.description ?? '').trim(),
  }
  const raw = await apiPost<CashRegisterExpenseDto>(
    API_ENDPOINTS.cashRegister.sessionExpenses(sessionId),
    body,
  )
  return registerExpenseFromApi(raw)
}
