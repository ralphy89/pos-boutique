import { ENV } from './env'

export const API_ENDPOINTS = {
  auth: {
    login: `${ENV.API_BASE_URL}/auth/login`,
    me: `${ENV.API_BASE_URL}/auth/me`,
    changePassword: `${ENV.API_BASE_URL}/auth/me/password`,
    register: `${ENV.API_BASE_URL}/auth/register`,
  },
  products: {
    list: `${ENV.API_BASE_URL}/products`,
    one: (id: number) => `${ENV.API_BASE_URL}/products/${id}`,
    lowStockSummary: `${ENV.API_BASE_URL}/products/low-stock/summary`,
  },
  customers: {
    list: `${ENV.API_BASE_URL}/customers`,
    one: (id: number) => `${ENV.API_BASE_URL}/customers/${id}`,
  },
  sales: {
    list: `${ENV.API_BASE_URL}/sales`,
    one: (id: number) => `${ENV.API_BASE_URL}/sales/${id}`,
    today: `${ENV.API_BASE_URL}/sales/today`,
  },
  cashRegister: {
    sessions: `${ENV.API_BASE_URL}/cash-register/sessions`,
    currentSession: `${ENV.API_BASE_URL}/cash-register/sessions/current`,
    closeSession: (sessionId: number) => `${ENV.API_BASE_URL}/cash-register/sessions/${sessionId}/close`,
    sessionPaymentBreakdown: (sessionId: number) =>
      `${ENV.API_BASE_URL}/cash-register/sessions/${sessionId}/payment-breakdown`,
    currentSessionPaymentBreakdown: `${ENV.API_BASE_URL}/cash-register/sessions/current/payment-breakdown`,
    sessionExpenses: (sessionId: number) =>
      `${ENV.API_BASE_URL}/cash-register/sessions/${sessionId}/expenses`,
  },
  credit: {
    summary: `${ENV.API_BASE_URL}/credit/summary`,
    debtors: `${ENV.API_BASE_URL}/credit/debtors`,
    ledger: (customerId: number) => `${ENV.API_BASE_URL}/credit/customers/${customerId}/ledger`,
    payments: `${ENV.API_BASE_URL}/credit/payments`,
  },
} as const

