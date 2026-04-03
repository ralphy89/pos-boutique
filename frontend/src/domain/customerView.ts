import {
  creditLimitFromApi,
  type CustomerDetailResponse,
  type CustomerMetrics,
  type CustomerRecord,
  type CustomerResponse,
} from '../types/customer'

export function parseCustomerIdParam(raw: string | undefined): number | null {
  if (raw == null || raw === '') return null
  if (!/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

function moneyFromApi(value: string | number): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

export function toCustomerRecord(row: CustomerResponse | CustomerDetailResponse): CustomerRecord {
  const base: CustomerRecord = {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    note: row.note,
    creditLimit: creditLimitFromApi(row.credit_limit),
    status: row.status,
    purchases: [],
    debtLedger: [],
    activities: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

  if (!('recent_purchases' in row)) {
    const listRow = row as CustomerResponse
    return {
      ...base,
      ledgerStats: {
        totalPurchase: 0,
        amountPaid: 0,
        currentDebt: moneyFromApi(listRow.debt_balance ?? 0),
      },
    }
  }

  const detail = row as CustomerDetailResponse
  const purchases = detail.recent_purchases.map((s) => ({
    id: `sale-${s.sale_id}`,
    date: s.created_at,
    amount: moneyFromApi(s.total),
    reference: `Sale #${s.sale_id} · ${s.payment_method}`,
    channel: 'counter' as const,
  }))

  return {
    ...base,
    purchases,
    ledgerStats: {
      totalPurchase: moneyFromApi(detail.total_purchase),
      amountPaid: moneyFromApi(detail.amount_paid),
      currentDebt: moneyFromApi(detail.debt_balance),
    },
  }
}

export function customerMetrics(c: CustomerRecord): CustomerMetrics {
  let totalPurchases: number
  let currentDebt: number
  let amountPaid: number

  if (c.ledgerStats) {
    totalPurchases = c.ledgerStats.totalPurchase
    amountPaid = c.ledgerStats.amountPaid
    currentDebt = c.ledgerStats.currentDebt
  } else {
    totalPurchases = c.purchases.reduce((s, p) => s + p.amount, 0)
    currentDebt = 0
    amountPaid = 0
    for (const d of c.debtLedger) {
      if (d.type === 'payment') {
        amountPaid += d.amount
        currentDebt -= d.amount
      } else {
        currentDebt += d.amount
      }
    }
    if (currentDebt < 0) currentDebt = 0
  }

  const lastPurchaseDate =
    c.purchases.length === 0
      ? null
      : c.purchases.reduce((best, p) => (p.date > best ? p.date : best), c.purchases[0].date)

  const dates: string[] = [
    ...c.purchases.map((p) => p.date),
    ...c.debtLedger.map((d) => d.date),
    ...c.activities.map((a) => a.date),
    c.updatedAt,
  ]
  const lastActivityDate = dates.length === 0 ? null : dates.reduce((a, b) => (a > b ? a : b))

  return {
    totalPurchases,
    currentDebt,
    amountPaid,
    lastPurchaseDate,
    lastActivityDate,
  }
}
