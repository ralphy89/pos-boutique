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

/** Updates stored sign-in hint when the user changes email in settings (same store as the active token). */
export function setStoredUserEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  if (localStorage.getItem(TOKEN_KEY)) localStorage.setItem(EMAIL_KEY, normalized)
  if (sessionStorage.getItem(TOKEN_KEY)) sessionStorage.setItem(EMAIL_KEY, normalized)
}

export function getApiBaseUrl(): string {
  return ENV.API_BASE_URL
}

