import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Credit as CreditRec, type Customer } from '@/lib/db'
import { dateDM, daysUntil, isoDay, money, phone } from '@/lib/format'
import { Header } from '@/components/Shell'
import { Button, Chip, Empty, FilterChip, Row } from '@/components/ui'
import { Icon } from '@/components/Icon'
import { CustomerPicker } from './Sell'

type F = 'all' | 'overdue' | 'week'

export interface CustomerDebtRow { customer: Customer; debt: number; overdueDays: number; nextDue?: string; partial: boolean }

export function summarize(customers: Customer[], credits: CreditRec[]): CustomerDebtRow[] {
  const today = isoDay()
  return customers.map((customer) => {
    const cs = credits.filter((c) => c.customerId === customer.id && c.status !== 'paid')
    const debt = cs.reduce((s, c) => s + c.amount - c.paid, 0)
    const overdue = cs.filter((c) => c.dueDate < today)
    const overdueDays = overdue.length ? Math.max(...overdue.map((c) => -daysUntil(c.dueDate))) : 0
    const next = cs.filter((c) => c.dueDate >= today).map((c) => c.dueDate).sort()[0]
    return { customer, debt, overdueDays, nextDue: next, partial: cs.some((c) => c.status === 'partial') }
  })
}

export function DebtChip({ r }: { r: CustomerDebtRow }) {
  if (r.debt <= 0) return <Chip tone="good" icon="check">Qarz yoʻq</Chip>
  if (r.overdueDays > 0) return <Chip tone="crit" icon="alert">{r.overdueDays} kun oʻtdi</Chip>
  if (r.nextDue) return <Chip tone="warn" icon="clock">{dateDM(r.nextDue + 'T00:00:00')} gacha</Chip>
  return <Chip tone="neutral">Ochiq</Chip>
}

export default function Credit() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const f = (params.get('f') as F) || 'all'
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const customers = useLiveQuery(() => db.customers.where('status').equals('active').toArray(), [])
  const credits = useLiveQuery(() => db.credits.toArray(), [])

  const rows = useMemo(() => {
    if (!customers || !credits) return undefined
    let xs = summarize(customers, credits)
    const n = q.trim().toLowerCase()
    if (n) xs = xs.filter((r) => r.customer.name.toLowerCase().includes(n) || (r.customer.phone ?? '').includes(n.replace(/\D/g, '')))
    if (f === 'overdue') xs = xs.filter((r) => r.overdueDays > 0)
    if (f === 'week') xs = xs.filter((r) => r.debt > 0 && r.nextDue && daysUntil(r.nextDue) <= 7)
    // Saralash: muddati o'tgan (ko'p kun) → yaqin muddat → qolganlar → qarzsizlar
    return xs.sort((a, b) => {
      if ((b.overdueDays > 0) !== (a.overdueDays > 0)) return b.overdueDays > 0 ? 1 : -1
      if (a.overdueDays !== b.overdueDays) return b.overdueDays - a.overdueDays
      if ((a.debt > 0) !== (b.debt > 0)) return a.debt > 0 ? -1 : 1
      if (a.nextDue && b.nextDue && a.nextDue !== b.nextDue) return a.nextDue < b.nextDue ? -1 : 1
      return a.customer.name.localeCompare(b.customer.name)
    })
  }, [customers, credits, q, f])

  const totals = useMemo(() => {
    if (!customers || !credits) return { debt: 0, overdue: 0, overdueCount: 0 }
    const all = summarize(customers, credits)
    return { debt: all.reduce((s, r) => s + r.debt, 0), overdue: all.filter((r) => r.overdueDays > 0).length, overdueCount: all.filter((r) => r.overdueDays > 0).reduce((s, r) => s + r.debt, 0) }
  }, [customers, credits])

  const setF = (v: F) => setParams(v === 'all' ? {} : { f: v }, { replace: true })

  return (
    <div>
      <Header title="Nasiya" right={<Button size="sm" icon="plus" variant="secondary" onClick={() => setAdding(true)}>Mijoz</Button>} />
      <div className="px-4 pt-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-[13px] text-muted">Jami qarz</div>
          <div className="font-display text-3xl font-bold tnum">{money(totals.debt)}</div>
          {totals.overdue > 0 && <button onClick={() => setF('overdue')} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-crit"><Icon name="alert" size={16} />Muddati oʻtgan · {totals.overdue} ta · {money(totals.overdueCount)}</button>}
        </div>
      </div>
      <div className="sticky top-14 z-20 bg-bg px-4 pb-2 pt-3">
        <label className="relative block">
          <Icon name="search" size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism yoki telefon…" aria-label="Mijoz qidirish" className="h-12 w-full rounded border border-line bg-surface pl-11 pr-4 text-base outline-none focus:border-accent" />
        </label>
        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
          <FilterChip active={f === 'all'} onClick={() => setF('all')}>Hammasi</FilterChip>
          <FilterChip active={f === 'overdue'} onClick={() => setF('overdue')}>Muddati oʻtgan</FilterChip>
          <FilterChip active={f === 'week'} onClick={() => setF('week')}>Shu hafta</FilterChip>
        </div>
      </div>

      {!rows ? (
        <ul className="px-4">{[...Array(4)].map((_, i) => <li key={i} className="mb-2 h-16 animate-pulse rounded-lg bg-surface-2" />)}</ul>
      ) : rows.length === 0 ? (
        f === 'all' && !q
          ? <Empty icon="credit" title="Nasiya yoʻq." text="Sotuvda «Nasiya» toʻlov turini tanlasangiz, mijoz va qarzi shu yerda koʻrinadi." />
          : <Empty icon="search" title={f === 'overdue' ? 'Muddati oʻtgan qarz yoʻq.' : 'Topilmadi.'} action={<Button variant="secondary" onClick={() => { setF('all'); setQ('') }}>Hammasini koʻrsatish</Button>} />
      ) : (
        <ul className="border-t border-line">
          {rows.map((r) => (
            <li key={r.customer.id}><Row onClick={() => nav(`/credit/${r.customer.id}`)} className={r.debt <= 0 ? 'opacity-70' : ''}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.customer.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted">
                  {r.customer.phone && <span className="font-mono">{phone(r.customer.phone)}</span>}
                  <DebtChip r={r} />
                  {r.partial && r.debt > 0 && <Chip tone="neutral">Qisman</Chip>}
                </div>
              </div>
              <span className={`font-mono text-[15px] font-medium tnum ${r.overdueDays > 0 ? 'text-crit' : ''}`}>{money(r.debt, false)}</span>
              <Icon name="chevronRight" size={18} className="shrink-0 text-line-strong" />
            </Row></li>
          ))}
        </ul>
      )}
      <CustomerPicker open={adding} onClose={() => setAdding(false)} onPick={(c) => { setAdding(false); nav(`/credit/${c.id}`) }} />
    </div>
  )
}
