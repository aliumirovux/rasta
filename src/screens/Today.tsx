import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, stockState, type PaymentType } from '@/lib/db'
import { isoDay, money, startOfDay, time, uzDateLong } from '@/lib/format'
import { payLabel } from '@/lib/receipt'
import { Header, SyncChip } from '@/components/Shell'
import { Button, Empty, Row, SectionTitle } from '@/components/ui'
import { Icon, type IconName } from '@/components/Icon'

const DAY = 86400000

// S1 — Bugun: hero (bugungi savdo + kecha bilan solishtirish + 7 kunlik trend + naqd/nasiya),
// tezkor amallar, "E'tibor kerak", oxirgi sotuvlar. Desktopda 2 ustunli dashboard.
export default function Today() {
  const nav = useNavigate()
  const store = useLiveQuery(() => db.settings.get('store'), [])
  const storeName = (store?.value as { name?: string } | undefined)?.name ?? 'Rasta'
  const productsCount = useLiveQuery(() => db.products.where('status').equals('active').count(), [], -1)

  const data = useLiveQuery(async () => {
    const now = Date.now()
    const todayStart = startOfDay()
    const sales = (await db.sales.where('createdAt').aboveOrEqual(todayStart).toArray()).filter((s) => s.status !== 'returned')
    const total = sales.reduce((s, x) => s + x.total, 0)
    const cash = sales.filter((s) => s.paymentType === 'cash').reduce((s, x) => s + x.total, 0)
    const credit = sales.filter((s) => s.paymentType === 'credit').reduce((s, x) => s + x.total, 0)

    // Kecha shu vaqtgacha — adolatli solishtirish uchun
    const elapsed = now - todayStart
    const ydayStart = todayStart - DAY
    const ydayTotal = (await db.sales.where('createdAt').between(ydayStart, ydayStart + elapsed, true, false).toArray())
      .filter((s) => s.status !== 'returned').reduce((s, x) => s + x.total, 0)

    // Oxirgi 7 kun (0 = 6 kun oldin … 6 = bugun)
    const weekStart = startOfDay(new Date(now - 6 * DAY))
    const weekSales = (await db.sales.where('createdAt').aboveOrEqual(weekStart).toArray()).filter((s) => s.status !== 'returned')
    const days = Array.from({ length: 7 }, (_, i) => {
      const ds = startOfDay(new Date(now - (6 - i) * DAY))
      return weekSales.filter((s) => s.createdAt >= ds && s.createdAt < ds + DAY).reduce((a, x) => a + x.total, 0)
    })

    const today = isoDay()
    const overdue = (await db.credits.toArray()).filter((c) => c.status !== 'paid' && c.dueDate < today)
    const overdueSum = overdue.reduce((s, c) => s + c.amount - c.paid, 0)
    const products = await db.products.where('status').equals('active').toArray()
    const low = products.filter((p) => stockState(p) !== 'ok').length
    const recent = await db.sales.orderBy('createdAt').reverse().limit(6).toArray()
    return {
      total, count: sales.length, cash, credit, ydayTotal, days,
      overdueCount: new Set(overdue.map((c) => c.customerId)).size, overdueSum, low, recent,
    }
  }, [])

  const delta = data && data.ydayTotal > 0 ? Math.round(((data.total - data.ydayTotal) / data.ydayTotal) * 100) : null

  return (
    <div>
      <Header title={storeName} sub={uzDateLong()} right={<SyncChip />} />
      {!data ? (
        <div className="mx-4 mt-4 h-56 animate-pulse rounded-xl bg-surface-2 lg:mx-6 lg:mt-6" />
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:px-6 lg:py-6">
          {/* HERO — chap ustun, 1-qator */}
          <div className="lg:col-start-1 lg:row-start-1">
            <div className="mx-4 mt-4 overflow-hidden rounded-xl border border-line bg-surface shadow-card lg:mx-0 lg:mt-0">
              <div className="px-[18px] pb-3.5 pt-[18px] lg:px-6 lg:pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-muted lg:text-sm">Bugungi savdo</span>
                  {delta !== null && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-semibold ${delta >= 0 ? 'bg-good-soft text-good' : 'bg-crit-soft text-crit'}`}>
                      <Icon name={delta >= 0 ? 'arrowUp' : 'arrowDown'} size={12} strokeWidth={2.4} />{Math.abs(delta)}%
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-display text-[38px] font-bold leading-none tnum lg:text-[48px]">{money(data.total, false)}</span>
                  <span className="font-display text-lg font-semibold text-muted lg:text-xl">soʻm</span>
                </div>
                <div className="mt-2 text-[13px] text-muted lg:text-sm">
                  {data.ydayTotal > 0
                    ? <>Kecha shu vaqtda <span className="tnum text-ink">{money(data.ydayTotal, false)}</span> edi</>
                    : 'Kecha shu vaqtda savdo boʻlmagan'}
                </div>
                <Spark days={data.days} />
                <div className="text-[11px] text-muted lg:text-xs">Soʻnggi 7 kun</div>
              </div>
              <div className="flex border-t border-line">
                <BreakCell label="Sotuvlar" value={String(data.count)} sub="ta" onClick={() => nav('/more/sales')} />
                <BreakCell label="Naqd" value={money(data.cash, false)} sub="soʻm" onClick={() => nav('/more/sales?pay=cash')} border />
                <BreakCell label="Nasiya" value={money(data.credit, false)} sub="soʻm" onClick={() => nav('/more/sales?pay=credit')} border />
              </div>
            </div>
          </div>

          {/* TEZKOR AMALLAR — o'ng ustun, 1-qator */}
          <div className="lg:col-start-2 lg:row-start-1">
            <div className="mx-4 mt-3.5 flex gap-3 lg:mx-0 lg:mt-0 lg:flex-col lg:gap-3">
              <QuickTile icon="plus" label="Tovar qoʻshish" onClick={() => nav('/products?add=1')} />
              <QuickTile icon="credit" label="Nasiya toʻlovi" onClick={() => nav('/credit')} />
            </div>
          </div>

          {/* E'TIBOR KERAK — o'ng ustun, 2-qator */}
          {(data.overdueCount > 0 || data.low > 0) && (
            <div className="lg:col-start-2 lg:row-start-2">
              <SectionTitle className="lg:mt-0 lg:px-0">Eʼtibor kerak</SectionTitle>
              <ul className="mx-4 overflow-hidden rounded-xl border border-line lg:mx-0">
                {data.overdueCount > 0 && (
                  <li><Row onClick={() => nav('/credit?f=overdue')}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crit-soft text-crit"><Icon name="alert" size={19} strokeWidth={2} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">Muddati oʻtgan qarzlar</span>
                      <span className="block text-[13px] text-muted tnum">{money(data.overdueSum)}</span>
                    </span>
                    <span className="rounded-full bg-crit-soft px-2 py-px font-display text-[17px] font-bold text-crit tnum">{data.overdueCount}</span>
                    <Icon name="chevronRight" size={18} className="shrink-0 text-line-strong" />
                  </Row></li>
                )}
                {data.low > 0 && (
                  <li><Row onClick={() => nav('/products?stock=low')}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn-soft text-warn"><Icon name="box" size={19} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">Kam qolgan tovarlar</span>
                      <span className="block text-[13px] text-muted">Tugagan yoki min qoldiqdan past</span>
                    </span>
                    <span className="rounded-full bg-warn-soft px-2 py-px font-display text-[17px] font-bold text-warn tnum">{data.low}</span>
                    <Icon name="chevronRight" size={18} className="shrink-0 text-line-strong" />
                  </Row></li>
                )}
              </ul>
            </div>
          )}

          {/* OXIRGI SOTUVLAR — chap ustun, 2-qator */}
          <div className="lg:col-start-1 lg:row-start-2">
            <SectionTitle className="lg:mt-0 lg:px-0" action={data.recent.length > 0 ? <button onClick={() => nav('/more/sales')} className="text-sm font-semibold text-accent-text">Hammasi</button> : undefined}>Oxirgi sotuvlar</SectionTitle>
            {data.recent.length === 0 ? (
              productsCount === 0
                ? <Empty icon="box" title="Avval tovarlarni kiriting." action={<Button onClick={() => nav('/products?add=1')} icon="plus">Tovar qoʻshish</Button>} />
                : <Empty icon="cart" title="Bugun hali sotuv yoʻq." action={<Button icon="cart" onClick={() => nav('/sell')}>Sotish</Button>} />
            ) : (
              <ul className="mx-4 overflow-hidden rounded-xl border border-line lg:mx-0">
                {data.recent.map((s) => (
                  <li key={s.id}><Row onClick={() => nav(`/more/sales/${s.id}`)}>
                    <span className="w-11 shrink-0 font-mono text-[13px] text-muted tnum">{time(s.createdAt)}</span>
                    <span className="min-w-0 flex-1 truncate">{s.lines[0]?.name}{s.lines.length > 1 ? ` +${s.lines.length - 1}` : ''}</span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-[15px] font-medium tnum">{money(s.total, false)}</span>
                      <PayChip t={s.paymentType} />
                    </span>
                  </Row></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Spark({ days }: { days: number[] }) {
  const max = Math.max(...days, 1)
  return (
    <div className="mb-1 mt-3.5 flex h-[34px] items-end gap-1.5 lg:h-[48px]">
      {days.map((v, i) => {
        const today = i === days.length - 1
        return <span key={i} className={`flex-1 rounded-[3px] ${today ? 'bg-accent' : 'bg-line-strong'}`}
          style={{ height: `${Math.max(6, Math.round((v / max) * 100))}%`, opacity: today ? 1 : 0.55 }} />
      })}
    </div>
  )
}

function BreakCell({ label, value, sub, onClick, border }: { label: string; value: string; sub: string; onClick: () => void; border?: boolean }) {
  return (
    <button onClick={onClick} className={`press flex-1 px-1 py-3 text-center hover:bg-surface-2 lg:py-4 ${border ? 'border-l border-line' : ''}`}>
      <div className="text-[12px] text-muted lg:text-[13px]">{label}</div>
      <div className="mt-0.5 font-display text-[19px] font-bold tnum lg:text-[22px]">{value}</div>
      <div className="text-[11px] text-muted">{sub}</div>
    </button>
  )
}

function QuickTile({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="press flex flex-1 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 text-left shadow-card hover:bg-surface-2 lg:w-full lg:flex-none lg:py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-accent-soft text-accent-text"><Icon name={icon} size={20} strokeWidth={1.9} /></span>
      <span className="text-[14px] font-medium leading-tight lg:text-[15px]">{label}</span>
    </button>
  )
}

const PAY_TONE: Record<PaymentType, string> = {
  cash: 'bg-good-soft text-good',
  card: 'bg-blue-soft text-blue',
  transfer: 'bg-neutral-soft text-neutral',
  credit: 'bg-warn-soft text-warn',
}
function PayChip({ t }: { t: PaymentType }) {
  return <span className={`rounded-full px-2 py-px text-[11.5px] font-medium leading-5 ${PAY_TONE[t]}`}>{payLabel(t)}</span>
}
