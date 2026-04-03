import { clearSession, getAccessToken } from '../auth/session'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function parseApiErrorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { detail?: string | unknown } | null
  const detail = body?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item && typeof (item as { msg?: string }).msg === 'string')
          return (item as { msg: string }).msg
        return ''
      })
      .filter(Boolean)
    if (msgs.length) return msgs.join(' ')
  }
  return `Request failed (${res.status})`
}

function requireAuthHeaders(): HeadersInit {
  const token = getAccessToken()
  if (!token) {
    clearSession()
    window.location.assign('/login')
    throw new ApiError('Not authenticated', 401)
  }
  return { Authorization: `Bearer ${token}` }
}

export async function apiGet<T>(url: string, init?: RequestInit): Promise<T> {
  const tokenHeaders = requireAuthHeaders()
  const res = await fetch(url, {
    ...init,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...init?.headers,
      ...tokenHeaders,
    },
  })

  if (res.status === 401 || res.status === 403) {
    clearSession()
    window.location.assign('/login')
    throw new ApiError('Session expired', res.status)
  }

  if (!res.ok) {
    const message = await parseApiErrorMessage(res)
    throw new ApiError(message, res.status)
  }

  return res.json() as Promise<T>
}

export async function apiPost<T>(url: string, body: unknown, init?: RequestInit): Promise<T> {
  const tokenHeaders = requireAuthHeaders()
  const res = await fetch(url, {
    ...init,
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
      ...tokenHeaders,
    },
    body: JSON.stringify(body),
  })

  if (res.status === 401 || res.status === 403) {
    clearSession()
    window.location.assign('/login')
    throw new ApiError('Session expired', res.status)
  }

  if (!res.ok) {
    const message = await parseApiErrorMessage(res)
    throw new ApiError(message, res.status)
  }

  return res.json() as Promise<T>
}

export async function apiPut<T>(url: string, body: unknown, init?: RequestInit): Promise<T> {
  const tokenHeaders = requireAuthHeaders()
  const res = await fetch(url, {
    ...init,
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
      ...tokenHeaders,
    },
    body: JSON.stringify(body),
  })

  if (res.status === 401 || res.status === 403) {
    clearSession()
    window.location.assign('/login')
    throw new ApiError('Session expired', res.status)
  }

  if (!res.ok) {
    const message = await parseApiErrorMessage(res)
    throw new ApiError(message, res.status)
  }

  return res.json() as Promise<T>
}

export async function apiPatch<T>(url: string, body: unknown, init?: RequestInit): Promise<T> {
  const tokenHeaders = requireAuthHeaders()
  const res = await fetch(url, {
    ...init,
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
      ...tokenHeaders,
    },
    body: JSON.stringify(body),
  })

  if (res.status === 401 || res.status === 403) {
    clearSession()
    window.location.assign('/login')
    throw new ApiError('Session expired', res.status)
  }

  if (!res.ok) {
    const message = await parseApiErrorMessage(res)
    throw new ApiError(message, res.status)
  }

  return res.json() as Promise<T>
}

export async function apiDelete(url: string, init?: RequestInit): Promise<void> {
  const tokenHeaders = requireAuthHeaders()
  const res = await fetch(url, {
    ...init,
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...init?.headers,
      ...tokenHeaders,
    },
  })

  if (res.status === 401 || res.status === 403) {
    clearSession()
    window.location.assign('/login')
    throw new ApiError('Session expired', res.status)
  }

  if (!res.ok) {
    const message = await parseApiErrorMessage(res)
    throw new ApiError(message, res.status)
  }
}
