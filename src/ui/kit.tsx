import type { ReactNode } from 'react'

export function Screen({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 pb-24 pt-4">{children}</div>
}

export function TopBar({
  title,
  onBack,
  right,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <header className="mb-4 flex items-center gap-3">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Назад"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-xl"
        >
          ←
        </button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">{title}</h1>
      {right}
    </header>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>{children}</div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'ok' | 'bad' | 'warn'
  disabled?: boolean
  className?: string
}) {
  const styles: Record<string, string> = {
    primary: 'bg-accent text-ink active:bg-accent-dim',
    ghost: 'border border-line bg-surface-2 text-fg active:bg-line',
    ok: 'bg-ok/15 text-ok border border-ok/40 active:bg-ok/25',
    bad: 'bg-bad/15 text-bad border border-bad/40 active:bg-bad/25',
    warn: 'bg-warn/15 text-warn border border-warn/40 active:bg-warn/25',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 rounded-xl px-4 font-medium transition disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full min-h-12 rounded-xl border border-line bg-surface-2 px-3 text-fg outline-none focus:border-accent'

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-10 text-center text-sm text-muted">{children}</div>
}
