import { ENV } from '../config/env'

const TOKEN_KEY = 'pos.access_token'
const EMAIL_KEY = 'pos.user_email'

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EMAIL_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EMAIL_KEY)
}

export function getApiBaseUrl(): string {
  return ENV.API_BASE_URL
}

