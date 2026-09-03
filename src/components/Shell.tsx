import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon, type IconName } from './Icon'
import { Chip, IconButton } from './ui'
import { db } from '@/lib/db'
import { useNavigate } from 'react-router-dom'

const tabs: { to: string; label: string; icon: IconName; primary?: boolean }[] = [
  { to: '/today', label: 'Bugun', icon: 'home' },
  { to: '/products', label: 'Tovarlar', icon: 'box' },
  { to: '/sell', label: 'Sotish', icon: 'cart', primary: true },
  { to: '/credit', label: 'Nasiya', icon: 'credit' },
  { to: '/more', label: 'Yana', icon: 'more' },
]

export function useOnline() {
  const [on, setOn] = useState(navigator.onLine)
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false)
    window.addEventListener('online', a); window.addEventListener('offline', b)
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b) }
  }, [])
  return on
}

/** Sinxron holati chipi — PRD 06: Saqlandi / Yuborilmoqda · N / Oflayn */
const SYNC_ENABLED = !!import.meta.env.VITE_SUPABASE_URL // sync yo'q — hamma narsa telefonda; "Yuborilmoqda" ko'rsatilmaydi
export function SyncChip() {
  const online = useOnline()
  const pending = useLiveQuery(() => db.sales.where('synced').equals(0).count(), [], 0)
  if (!online) return <Chip tone="warn" icon="wifiOff">Oflayn</Chip>
  if (SYNC_ENABLED && pending > 0) return <Chip tone="neutral" icon="cloud">Yuborilmoqda · {pending}</Chip>
  return <span className="inline-flex items-center gap-1 text-[13px] text-muted"><Icon name="check" size={14} />Saqlandi</span>
}

export function Shell() {
  const { pathname } = useLocation()
  const hideTabs = pathname.startsWith('/sell/done')
  return (
    <div className="flex min-h-dvh w-full lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* Desktop chap panel */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-line lg:bg-surface">
        <div className="px-5 pb-4 pt-6">
          <div className="font-display text-2xl font-bold tracking-tight">Rasta</div>
          <div className="mt-1 text-xs text-muted">sotuv · qoldiq · nasiya</div>
        </div>
        <nav className="flex flex-col gap-0.5 px-3">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => `flex h-11 items-center gap-3 rounded px-3 text-[15px] font-medium ${isActive ? 'bg-accent-soft text-accent-text' : 'text-ink hover:bg-surface-2'}`}>
              <Icon name={t.icon} size={20} />{t.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-5 pb-5"><SyncChip /></div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className={`flex-1 ${hideTabs ? '' : 'pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] lg:pb-6'}`}>
          <Outlet />
        </main>
        {!hideTabs && (
          <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface safe-b lg:hidden" aria-label="Asosiy">
            <ul className="mx-auto flex h-[var(--tabbar-h)] max-w-lg items-stretch">
              {tabs.map((t) => (
                <li key={t.to} className="flex-1">
                  <NavLink to={t.to} className={({ isActive }) => `flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${t.primary ? (isActive ? 'text-accent-text' : 'text-accent-text') : isActive ? 'text-accent-text' : 'text-muted'}`}>
                    {({ isActive }) => (
                      <>
                        {t.primary ? (
                          <span className={`-mt-5 flex h-12 w-12 items-center justify-center rounded-full shadow-card ${isActive ? 'bg-accent text-accent-ink' : 'bg-accent text-accent-ink'}`}><Icon name={t.icon} size={24} /></span>
                        ) : (
                          <Icon name={t.icon} size={24} strokeWidth={isActive ? 2.2 : 1.75} />
                        )}
                        <span>{t.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  )
}

/** Sahifa sarlavhasi: orqaga / nom / o'ng harakat */
export function Header({ title, back, right, sub }: { title: ReactNode; back?: boolean | string; right?: ReactNode; sub?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg">
      <div className="flex h-14 items-center gap-1 px-2">
        {back && <IconButton icon="chevronLeft" label="Orqaga" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))} />}
        <div className={`min-w-0 flex-1 ${back ? '' : 'px-2'}`}>
          <h1 className="truncate font-display text-[22px] font-bold leading-tight">{title}</h1>
          {sub && <div className="truncate text-[13px] text-muted">{sub}</div>}
        </div>
        <div className="flex items-center gap-1 pr-1">{right}</div>
      </div>
    </header>
  )
}
