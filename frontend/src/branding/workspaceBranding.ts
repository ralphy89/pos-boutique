import { ENV } from '../config/env'

export const WORKSPACE_BRANDING_STORAGE_KEY = 'pos.workspace_branding'

export type WorkspaceBranding = {
  posName: string
  logoDataUrl: string | null
}

export function getDefaultWorkspaceBranding(): WorkspaceBranding {
  return {
    posName: ENV.APP_NAME,
    logoDataUrl: null,
  }
}

export function loadWorkspaceBranding(): WorkspaceBranding {
  try {
    const raw = localStorage.getItem(WORKSPACE_BRANDING_STORAGE_KEY)
    if (!raw) return getDefaultWorkspaceBranding()
    const parsed = JSON.parse(raw) as Partial<WorkspaceBranding>
    const name =
      typeof parsed.posName === 'string' && parsed.posName.trim() ? parsed.posName.trim() : ENV.APP_NAME
    const logo =
      typeof parsed.logoDataUrl === 'string' && parsed.logoDataUrl.startsWith('data:image/')
        ? parsed.logoDataUrl
        : null
    return { posName: name, logoDataUrl: logo }
  } catch {
    return getDefaultWorkspaceBranding()
  }
}

export function saveWorkspaceBranding(b: WorkspaceBranding) {
  localStorage.setItem(WORKSPACE_BRANDING_STORAGE_KEY, JSON.stringify(b))
}

/** Resize and compress for localStorage; rejects if result is still too large. */
export async function processLogoFile(
  file: File,
  opts: { maxEdge?: number; maxBytes?: number } = {},
): Promise<string> {
  const maxEdge = opts.maxEdge ?? 192
  const maxBytes = opts.maxBytes ?? 450_000

  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (PNG, JPG, WebP, etc.).')
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Could not read the file.'))
    r.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Invalid or unsupported image.'))
    el.src = dataUrl
  })

  let w = img.naturalWidth
  let h = img.naturalHeight
  if (w < 1 || h < 1) throw new Error('Image size is invalid.')
  const scale = Math.min(1, maxEdge / Math.max(w, h))
  w = Math.max(1, Math.round(w * scale))
  h = Math.max(1, Math.round(h * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process image.')
  ctx.drawImage(img, 0, 0, w, h)

  let quality = 0.88
  let out = canvas.toDataURL('image/jpeg', quality)
  while (out.length > maxBytes && quality > 0.45) {
    quality -= 0.08
    out = canvas.toDataURL('image/jpeg', quality)
  }
  if (out.length > maxBytes) {
    throw new Error('Image is still too large after compression. Try a smaller file.')
  }
  return out
}
