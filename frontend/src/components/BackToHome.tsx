import { Link } from 'react-router-dom'
import { ArrowUpLeft } from 'lucide-react'
import clsx from 'clsx'

export function BackToHome({ className }: { className?: string }) {
  return (
    <Link
      to="/home"
      className={clsx(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-ink/80 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-ink',
        className,
      )}
      aria-label="Back to home"
      title="Home"
    >
      <ArrowUpLeft className="h-4 w-4" strokeWidth={1.75} />
    </Link>
  )
}
