import { useWorkspaceBrandingOptional } from '../branding/BrandingContext'

export function BrandMark({ size = 40 }: { size?: number }) {
  const brandingCtx = useWorkspaceBrandingOptional()
  const logo = brandingCtx?.branding.logoDataUrl

  if (logo) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_24px_80px_-32px_rgba(0,0,0,0.9)]"
        style={{ width: size, height: size }}
      >
        <img src={logo} alt="" className="h-full w-full object-contain p-1" />
      </div>
    )
  }

  return (
    <div
      className="relative grid place-items-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_24px_80px_-32px_rgba(0,0,0,0.9)]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_0%_0%,color-mix(in_oklab,var(--accent)_40%,transparent),transparent_55%)] opacity-80" />
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_100%_100%,color-mix(in_oklab,var(--accent-2)_34%,transparent),transparent_55%)] opacity-70" />
      <div className="relative h-3 w-3 rounded-full bg-[var(--accent)] shadow-[0_0_24px_color-mix(in_oklab,var(--accent)_55%,transparent)]" />
    </div>
  )
}
