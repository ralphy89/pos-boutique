import { API_ENDPOINTS } from '../config/endpoints'
import { apiGet, apiPatch, apiPost } from './client'

export type AuthUser = {
  id: number
  email: string
  full_name: string | null
  is_active: boolean
  is_admin: boolean
}

export async function fetchMe(): Promise<AuthUser> {
  return apiGet<AuthUser>(API_ENDPOINTS.auth.me)
}

export async function updateSignInEmail(email: string, currentPassword: string): Promise<AuthUser> {
  return apiPatch<AuthUser>(API_ENDPOINTS.auth.me, {
    email: email.trim().toLowerCase(),
    current_password: currentPassword,
  })
}

export async function changeAccountPassword(currentPassword: string, newPassword: string): Promise<AuthUser> {
  return apiPost<AuthUser>(API_ENDPOINTS.auth.changePassword, {
    current_password: currentPassword,
    new_password: newPassword,
  })
}
