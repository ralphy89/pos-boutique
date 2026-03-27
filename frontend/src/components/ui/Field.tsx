import { type InputHTMLAttributes } from 'react'
import clsx from 'clsx'

export function FieldLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={clsx('text-xs font-medium tracking-[-0.01em] text-ink/70', className)}
    />
  )
}

export function TextField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        'h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-ink shadow-inner',
        'placeholder:text-ink/35',
        'focus:border-white/20 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_45%,transparent)]',
        className,
      )}
    />
  )
}

