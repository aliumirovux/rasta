import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, stockState } from '@/lib/db'
import { isoDay, money, startOfDay, time } from '@/lib/format'
import { payLabel } from '@/lib/receipt'
import { Header, SyncChip } from '@/components/Shell'
import { Button, Empty, KPI, Row, SectionTitle } from '@/components/ui'
import { Icon } from '@/components/Icon'

// S1 — Bugun: 4 KPI (har biri bosilsa ro'yxatga), "E'tibor kerak" (faqat muammo bo'lsa), oxirgi sotuvlar
export default function Today() {
  const nav = useNavigate()
  const store = useLiveQuery(() => db.settings.get('store'), [])
  const storeName = (store?.value as { name?: string } | undefined)?.name ?? 'Rasta'
  const productsCount = useLiveQuery(() => db.products.where('status').equals('active').count(), [], -1)

  const data = useLiveQuery(async () => {
    const from = startOfDay()
    const sales = (await db.sales.where('createdAt').aboveOrEqual(from).toArray()).filter((s) => s.status !== 'returned')
    const total = sales.reduce((s, x) => s + x.total, 0)
    const cash = sales.filter((s) => s.paymentType === 'cash').reduce((s, x) => s + x.total, 0)
    const credit = sales.filter((s) => s.paymentType === 'credit').reduce((s, x) => s + x.total, 0)
    const today = isoDay()
    const overdue = (await db.credits.toArray()).filter((c) => c.status !== 'paid' && c.dueDate < today)
    const overdueSum = overdue.reduce((s, c) => s + c.amount - c.paid, 0)
    const products = await db.products.where('status').equals('active').toArray()
    const low = products.filter((p) => stockState(p) !== 'ok').length
    const recent = (await db.sales.orderBy('createdAt').reverse().limit(5).toArray())
    return { total, count: sales.length, cash, credit, overdueCount: new Set(overdue.map((c) => c.customerId)).size, overdueSum, low, recent }
  }, [])

  return (
    <div>
      <Header title={storeName} right={<SyncChip />} />
      {!data ? (
        <div className="grid grid-cols-2 gap-3 p-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-2" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
            <KPI label="Bugungi sotuv" value={money(data.total, false)} sub="soʻm" onClick={() => nav('/more/sales')} />
            <KPI label="Sotuvlar" value={String(data.count)} sub="ta" onClick={() => nav('/more/sales')} />
            <KPI label="Naqd" value={money(data.cash, false)} sub="soʻm" onClick={() => nav('/more/sales?pay=cash')} />
            <KPI label="Nasiya berildi" value={money(data.credit, false)} sub="soʻm" onClick={() => nav('/more/sales?pay=credit')} />
          </div>

          {(data.overdueCount > 0 || data.low > 0) && (
            <>
              <SectionTitle>Eʼtibor kerak</SectionTitle>
              <ul className="mx-4 overflow-hidden rounded-lg border border-line">
                {data.overdueCount > 0 && (
                  <li><Row onClick={() => nav('/credit?f=overdue')}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-crit-soft text-crit"><Icon name="alert" size={18} /></span>
                    <span className="flex-1"><span className="block font-medium">Muddati oʻtgan qarzlar · {data.overdueCount} ta</span><span className="block text-[13px] text-muted tnum">{money(data.overdueSum)}</span></span>
                    <Icon name="chevronRight" size={18} className="text-line-strong" />
                  </Row></li>
                )}
                {data.low > 0 && (
                  <li><Row onClick={() => nav('/products?stock=low')}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warn-soft text-warn"><Icon name="box" size={18} /></span>
                    <span className="flex-1"><span className="block font-medium">Kam qolgan tovarlar · {data.low} ta</span><span className="block text-[13px] text-muted">Tugagan yoki min qoldiqdan past</span></span>
                    <Icon name="chevronRight" size={18} className="text-line-strong" />
                  </Row></li>
                )}
              </ul>
            </>
          )}

          <SectionTitle action={data.recent.length > 0 ? <button onClick={() => nav('/more/sales')} className="text-sm font-medium text-accent">Hammasi</button> : undefined}>Oxirgi sotuvlar</SectionTitle>
          {data.recent.length === 0 ? (
            productsCount === 0
              ? <Empty icon="box" title="Avval tovarlarni kiriting." action={<><Button onClick={() => nav('/products')} icon="plus">Tovar qoʻshish</Button></>} />
              : <Empty icon="cart" title="Bugun hali sotuv yoʻq." action={<Button icon="cart" onClick={() => nav('/sell')}>Sotish</Button>} />
          ) : (
            <ul className="mx-4 overflow-hidden rounded-lg border border-line">
              {data.recent.map((s) => (
                <li key={s.id}><Row onClick={() => nav(`/more/sales/${s.id}`)}>
                  <span className="w-12 font-mono text-[13px] text-muted tnum">{time(s.createdAt)}</span>
                  <span className="min-w-0 flex-1 truncate">{s.lines[0]?.name}{s.lines.length > 1 ? ` +${s.lines.length - 1}` : ''}</span>
                  <span className="flex flex-col items-end"><span className="font-mono text-[15px] font-medium tnum">{money(s.total, false)}</span><span className="text-[12px] text-muted">{payLabel(s.paymentType)}</span></span>
                </Row></li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
