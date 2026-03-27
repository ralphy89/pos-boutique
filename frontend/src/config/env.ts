const DEFAULT_API_BASE_URL = 'http://localhost:8000'

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export const ENV = {
  API_BASE_URL: trimSlash(import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL),
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'POS Boutique',
}

