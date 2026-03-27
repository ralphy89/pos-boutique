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
  // sales: { list: `${ENV.API_BASE_URL}/sales`, create: `${ENV.API_BASE_URL}/sales` },
  // customers: { list: `${ENV.API_BASE_URL}/customers`, create: `${ENV.API_BASE_URL}/customers` },
} as const

