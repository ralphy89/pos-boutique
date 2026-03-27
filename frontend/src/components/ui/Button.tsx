import { type ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'highlight'
}

export function Button({ className, variant = 'primary', ...props }: Props) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium tracking-[-0.01em] transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--accent)_55%,white)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        variant === 'primary' && [
          'text-white',
          'bg-[var(--accent)]',
          'shadow-[0_4px_20px_-6px_rgba(0,0,0,0.45)]',
          'hover:brightness-[1.06] active:brightness-[0.98]',
        ],
        variant === 'highlight' && [
          'text-[color-mix(in_oklab,var(--accent)_70%,black)]',
          'bg-[var(--highlight)]',
          'shadow-[0_4px_20px_-6px_rgba(0,0,0,0.35)]',
          'hover:brightness-[1.04] active:brightness-[0.98]',
        ],
        variant === 'ghost' && [
          'text-ink/80 border border-white/10 bg-white/[0.03]',
          'hover:bg-white/[0.05] active:bg-white/[0.04]',
        ],
        className,
      )}
    />
  )
}
