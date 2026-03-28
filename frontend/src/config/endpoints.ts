import { ENV } from './env'

export const API_ENDPOINTS = {
  auth: {
    login: `${ENV.API_BASE_URL}/auth/login`,
    me: `${ENV.API_BASE_URL}/auth/me`,
    register: `${ENV.API_BASE_URL}/auth/register`,
  },
  products: {
    list: `${ENV.API_BASE_URL}/products`,
    one: (id: number) => `${ENV.API_BASE_URL}/products/${id}`,
  },
  customers: {
    list: `${ENV.API_BASE_URL}/customers`,
    one: (id: number) => `${ENV.API_BASE_URL}/customers/${id}`,
  },
  sales: {
    list: `${ENV.API_BASE_URL}/sales`,
    one: (id: number) => `${ENV.API_BASE_URL}/sales/${id}`,
  },
} as const

