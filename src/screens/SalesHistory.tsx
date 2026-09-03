import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type PaymentType, type Sale } from '@/lib/db'
import { dayLabel, money, startOfDay, time } from '@/lib/format'
import { payLabel } from '@/lib/receipt'
import { Header } from '@/components/Shell'
import { Button, Chip, Empty, FilterChip, Row } from '@/components/ui'

type Period = 'today' | 'week' | 'month' | 'all'
const PAGE = 50

export default function SalesHistory() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const period = (params.get('p') as Period) || 'today'
  const pay = (params.get('pay') as PaymentType | null) || ''
  const [limit, setLimit] = useState(PAGE)

  const sales = useLiveQuery(async () => {
    const now = new Date()
    let from = 0
    if (period === 'today') from = startOfDay(now)
    if (period === 'week') from = startOfDay(now) - 6 * 86400000
    if (period === 'month') from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
    let xs = await db.sales.where('createdAt').aboveOrEqual(from).reverse().sortBy('createdAt')
    if (pay) xs = xs.filter((s) => s.paymentType === pay)
    return xs
  }, [period, pay])

  const groups = useMemo(() => {
    const g: { day: number; items: Sale[]; total: number }[] = []
    for (const s of (sales ?? []).slice(0, limit)) {
      const day = startOfDay(new Date(s.createdAt))
      let grp = g.find((x) => x.day === day)
      if (!grp) { grp = { day, items: [], total: 0 }; g.push(grp) }
      grp.items.push(s)
      if (s.status !== 'returned') grp.total += s.total
    }
    return g
  }, [sales, limit])

  const set = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); setLimit(PAGE) }
  const total = (sales ?? []).filter((s) => s.status !== 'returned').reduce((s, x) => s + x.total, 0)

  return (
    <div>
      <Header title="Sotuvlar tarixi" back="/more" sub={sales ? `${sales.length} ta · ${money(total)}` : undefined} />
      <div className="sticky top-14 z-20 bg-bg px-4 pb-2 pt-3">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {([['today', 'Bugun'], ['week', 'Hafta'], ['month', 'Oy'], ['all', 'Hammasi']] as [Period, string][]).map(([k, l]) => <FilterChip key={k} active={period === k} onClick={() => set('p', k === 'today' ? '' : k)}>{l}</FilterChip>)}
          <span className="w-px shrink-0 bg-line" />
          {(['cash', 'card', 'transfer', 'credit'] as PaymentType[]).map((k) => <FilterChip key={k} active={pay === k} onClick={() => set('pay', pay === k ? '' : k)}>{payLabel(k)}</FilterChip>)}
        </div>
      </div>
      {!sales ? null : sales.length === 0 ? (
        <Empty icon="clock" title={pay ? 'Filtr boʻyicha topilmadi.' : 'Bu davrda sotuv yoʻq.'} action={<Button variant="secondary" onClick={() => { setParams({}, { replace: true }); set('p', 'all') }}>{pay ? 'Filtrlarni tozalash' : 'Davrni oʻzgartirish'}</Button>} />
      ) : (
        <>
          {groups.map((g) => (
            <section key={g.day}>
              <div className="flex items-center justify-between px-4 pb-1 pt-4 text-[13px]"><span className="font-medium">{dayLabel(g.day)}</span><span className="font-mono text-muted tnum">{money(g.total)}</span></div>
              <ul className="border-t border-line">
                {g.items.map((s) => (
                  <li key={s.id}><Row onClick={() => nav(`/more/sales/${s.id}`)}>
                    <span className="w-12 font-mono text-[13px] text-muted tnum">{time(s.createdAt)}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate">{s.lines.map((l) => l.name).slice(0, 2).join(', ')}{s.lines.length > 2 ? ` +${s.lines.length - 2}` : ''}</span><span className="flex items-center gap-2 text-[13px] text-muted">{payLabel(s.paymentType)}{s.status !== 'done' && <Chip tone={s.status === 'returned' ? 'outline' : 'neutral'}>{s.status === 'returned' ? 'Qaytarilgan' : 'Qisman qaytarilgan'}</Chip>}</span></span>
                    <span className={`font-mono text-[15px] font-medium tnum ${s.status === 'returned' ? 'text-muted line-through' : ''}`}>{money(s.total, false)}</span>
                  </Row></li>
                ))}
              </ul>
            </section>
          ))}
          {sales.length > limit && <div className="p-4"><Button variant="secondary" full onClick={() => setLimit((l) => l + PAGE)}>Yana {Math.min(PAGE, sales.length - limit)} ta koʻrsatish · {limit} / {sales.length}</Button></div>}
        </>
      )}
    </div>
  )
}
