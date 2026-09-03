import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from './Icon'
import { groupDigits, parseDigits } from '@/lib/format'

// ---------- Button ----------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'md' | 'lg' | 'sm'
  icon?: IconName
  full?: boolean
}
const variantCls: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-95 disabled:bg-neutral-soft disabled:text-muted',
  secondary: 'bg-surface-2 text-ink border border-line hover:bg-line/60 disabled:text-muted',
  ghost: 'bg-transparent text-accent hover:bg-accent-soft disabled:text-muted',
  danger: 'bg-crit-soft text-crit hover:brightness-95 disabled:text-muted',
}
const sizeCls = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-[15px]', lg: 'h-12 px-5 text-base' }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, full, className = '', children, ...rest }, ref) {
  return (
    <button ref={ref} className={`press inline-flex items-center justify-center gap-2 rounded font-medium select-none whitespace-nowrap disabled:cursor-not-allowed ${variantCls[variant]} ${sizeCls[size]} ${full ? 'w-full' : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  )
})

export function IconButton({ icon, label, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button aria-label={label} title={label} className={`press inline-flex h-11 w-11 items-center justify-center rounded text-ink hover:bg-surface-2 disabled:text-muted ${className}`} {...rest}>
      <Icon name={icon} size={22} />
    </button>
  )
}

// ---------- Chip (status) — rang + so'z + ikonka; rang yolg'iz emas ----------
type Tone = 'good' | 'warn' | 'crit' | 'neutral' | 'accent' | 'outline'
const toneCls: Record<Tone, string> = {
  good: 'bg-good-soft text-good', warn: 'bg-warn-soft text-warn', crit: 'bg-crit-soft text-crit',
  neutral: 'bg-neutral-soft text-neutral', accent: 'bg-accent-soft text-accent', outline: 'border border-line-strong text-muted',
}
export function Chip({ tone = 'neutral', icon, children, className = '' }: { tone?: Tone; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-medium leading-5 whitespace-nowrap ${toneCls[tone]} ${className}`}>
      {icon && <Icon name={icon} size={12} strokeWidth={2.2} />}
      {children}
    </span>
  )
}

// Filtr chipi (bosiladigan)
export function FilterChip({ active, children, onClick, icon }: { active?: boolean; children: ReactNode; onClick?: () => void; icon?: IconName }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`press inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-sm font-medium ${active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-ink'}`}>
      {children}
      {icon && <Icon name={icon} size={14} />}
    </button>
  )
}

// ---------- Input (yorliq ustida, xato ostida) ----------
interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string
  hint?: string
  error?: string
  value: string
  onChange: (v: string) => void
  suffix?: string
  mono?: boolean
}
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, value, onChange, suffix, mono, className = '', id, ...rest }, ref) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label htmlFor={fid} className="text-sm font-medium text-ink">{label}</label>}
      <div className="relative">
        <input ref={ref} id={fid} value={value} onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error} aria-describedby={error ? fid + '-err' : hint ? fid + '-hint' : undefined}
          className={`h-12 w-full rounded border bg-surface px-3.5 text-base text-ink outline-none focus:border-accent ${error ? 'border-crit' : 'border-line'} ${mono ? 'font-mono' : ''} ${suffix ? 'pr-14' : ''}`}
          {...rest} />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">{suffix}</span>}
      </div>
      {error ? <p id={fid + '-err'} className="text-[13px] text-crit">{error}</p> : hint ? <p id={fid + '-hint'} className="text-[13px] text-muted">{hint}</p> : null}
    </div>
  )
})

/** Summa maydoni: raqamli klaviatura, yozganda 85 000 ko'rinishi */
export function MoneyField({ value, onChange, ...rest }: Omit<FieldProps, 'value' | 'onChange'> & { value: number; onChange: (n: number) => void }) {
  return (
    <Field value={value ? groupDigits(String(value)) : ''} onChange={(v) => onChange(parseDigits(v))}
      inputMode="numeric" pattern="[0-9 ]*" suffix="soʻm" mono {...rest} />
  )
}

export function Select({ label, value, onChange, options, placeholder }: { label?: string; value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-sm font-medium">{label}</label>}
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full appearance-none rounded border border-line bg-surface px-3.5 pr-10 text-base outline-none focus:border-accent">
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <Icon name="chevronDown" size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      </div>
    </div>
  )
}

// ---------- Sheet (pastki) va Modal (to'liq ekran) ----------
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Yopish" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full flex-col rounded-t-xl bg-surface shadow-sheet sm:max-w-md sm:rounded-xl">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong sm:hidden" />
        {title && (
          <div className="flex items-center justify-between px-5 pb-2 pt-3">
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            <IconButton icon="x" label="Yopish" onClick={onClose} className="-mr-2" />
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-line bg-surface px-5 pb-4 pt-3 safe-b">{footer}</div>}
      </div>
    </div>, document.body)
}

export function Modal({ open, onClose, title, children, footer, closeLabel = 'Bekor qilish' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; closeLabel?: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex w-full flex-col bg-surface sm:max-w-lg sm:rounded-xl sm:shadow-sheet">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <Button variant="ghost" size="sm" onClick={onClose}>{closeLabel}</Button>
          <h2 className="flex-1 text-center font-display text-lg font-semibold">{title}</h2>
          <span className="w-[88px]" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line px-5 pb-4 pt-3 safe-b">{footer}</div>}
      </div>
    </div>, document.body)
}

// ---------- Kichik bloklar ----------
export function KPI({ label, value, sub, onClick, tone }: { label: string; value: string; sub?: string; onClick?: () => void; tone?: 'crit' | 'warn' }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`flex flex-col items-start rounded-lg border border-line bg-surface p-3.5 text-left ${onClick ? 'press hover:bg-surface-2' : ''}`}>
      <span className="text-[13px] text-muted">{label}</span>
      <span className={`mt-1 font-display text-[26px] font-bold leading-none tnum ${tone === 'crit' ? 'text-crit' : tone === 'warn' ? 'text-warn' : ''}`}>{value}</span>
      {sub && <span className="mt-1 text-[13px] text-muted">{sub}</span>}
    </Tag>
  )
}

export function Empty({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted"><Icon name={icon} size={24} /></div>
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

export function Row({ children, onClick, className = '' }: { children: ReactNode; onClick?: () => void; className?: string }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`flex w-full items-center gap-3 border-b border-line bg-surface px-4 py-3 text-left last:border-b-0 ${onClick ? 'press hover:bg-surface-2' : ''} ${className}`}>
      {children}
    </Tag>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between px-4">
      <h2 className="font-display text-lg font-semibold">{children}</h2>
      {action}
    </div>
  )
}

/** Stepper — 44×44 tugmalar */
export function Stepper({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div className="inline-flex items-center rounded border border-line bg-surface">
      <button type="button" aria-label="Kamaytirish" onClick={() => onChange(Math.max(min, value - 1))} className="press flex h-10 w-10 items-center justify-center text-ink disabled:text-muted" disabled={value <= min}><Icon name="minus" size={18} /></button>
      <span className="w-9 text-center font-mono text-base tnum">{value}</span>
      <button type="button" aria-label="Koʻpaytirish" onClick={() => onChange(value + 1)} className="press flex h-10 w-10 items-center justify-center text-ink"><Icon name="plus" size={18} /></button>
    </div>
  )
}

/** Autofocus yordamchisi — sheet ochilganda maydonga fokus */
export function useAutoFocus<T extends HTMLElement>(when: boolean) {
  const ref = useRef<T>(null)
  useEffect(() => { if (when) setTimeout(() => ref.current?.focus(), 50) }, [when])
  return ref
}
