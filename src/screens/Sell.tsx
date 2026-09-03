import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { addCustomer, addToCart, cartTotal, createSale, customerDebt, db, getCart, lineTotal, setCart, stockState, type CartLine, type Customer, type PaymentType, type Product } from '@/lib/db'
import { addDays, dateShort, isoDay, money, phone, phoneDigits, phoneMask } from '@/lib/format'
import { Header, SyncChip } from '@/components/Shell'
import { Button, Chip, Empty, Field, Modal, MoneyField, Sheet, Stepper } from '@/components/ui'
import { Icon, type IconName } from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { searchProducts, StockChip } from './Products'

const PAY: { id: PaymentType; label: string; icon: IconName; hint: string }[] = [
  { id: 'cash', label: 'Naqd', icon: 'cash', hint: 'Qoʻlma-qoʻl' },
  { id: 'card', label: 'Karta', icon: 'card', hint: 'Terminal' },
  { id: 'transfer', label: 'Oʻtkazma', icon: 'transfer', hint: 'Click, Payme, Humo' },
  { id: 'credit', label: 'Nasiya', icon: 'credit', hint: 'Muddat bilan, mijozga yoziladi' },
]
const DUE = [3, 7, 14, 30]

export default function Sell() {
  const nav = useNavigate()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [editLine, setEditLine] = useState<CartLine | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const products = useLiveQuery(() => db.products.where('status').equals('active').sortBy('name'), [])
  const cart = useLiveQuery(() => getCart(), [])
  const lines = cart?.lines ?? []
  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products])
  const results = useMemo(() => (q.trim() && products ? searchProducts(products, q).slice(0, 30) : []), [products, q])

  // Tez tanlash — oxirgi sotuvlardagi tovarlar (takrorsiz, 8 ta)
  const recent = useLiveQuery(async () => {
    const sales = await db.sales.orderBy('createdAt').reverse().limit(30).toArray()
    const ids: string[] = []
    for (const s of sales) for (const l of s.lines) if (!ids.includes(l.productId)) ids.push(l.productId)
    return ids.slice(0, 8)
  }, [])

  useEffect(() => { searchRef.current?.focus() }, [])

  const add = async (p: Product) => {
    await addToCart(p.id, p.price)
    setQ('')
    searchRef.current?.focus()
  }
  const update = async (productId: string, patch: Partial<CartLine>) => {
    await setCart(lines.map((l) => (l.productId === productId ? { ...l, ...patch } : l)))
  }
  const remove = async (productId: string) => {
    const removed = lines.find((l) => l.productId === productId)
    await setCart(lines.filter((l) => l.productId !== productId))
    if (removed) toast({ text: 'Savatdan olib tashlandi', action: { label: 'Qaytarish', onClick: () => getCart().then((c) => setCart([removed, ...c.lines])) } })
  }
  const total = cartTotal(lines)

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* Chap: qidiruv + natijalar (desktopda doimiy) */}
      <div className="lg:border-r lg:border-line">
        <Header title="Sotish" right={<SyncChip />} />
        <div className="sticky top-14 z-20 bg-bg px-4 pb-2 pt-3">
          <label className="relative block">
            <Icon name="search" size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tovar qidirish…" enterKeyHint="search" autoComplete="off" aria-label="Tovar qidirish"
              onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) add(results[0]) }}
              className="h-12 w-full rounded border border-line bg-surface pl-11 pr-11 text-base outline-none focus:border-accent" />
            {q && <button aria-label="Tozalash" onClick={() => { setQ(''); searchRef.current?.focus() }} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-muted"><Icon name="x" size={18} /></button>}
          </label>
        </div>

        {q.trim() ? (
          results.length === 0 ? (
            <Empty icon="search" title="Topilmadi" action={<Button variant="secondary" icon="plus" onClick={() => nav('/products')}>„{q}“ nomli tovar qoʻshish</Button>} />
          ) : (
            <ul className="border-t border-line">
              {results.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
                  <button onClick={() => add(p)} className="min-w-0 flex-1 text-left">
                    <div className="line-clamp-2 font-medium leading-snug">{p.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">{p.sku && <span className="font-mono">{p.sku}</span>}<span>{p.models.join(', ')}</span><StockChip p={p} /></div>
                  </button>
                  <div className="flex flex-col items-end"><span className="font-mono text-[15px] font-medium tnum">{money(p.price, false)}</span><span className={`text-[13px] tnum ${p.stock <= 0 ? 'text-crit' : 'text-muted'}`}>{p.stock} {p.unit}</span></div>
                  <button aria-label={`${p.name} — savatga`} onClick={() => add(p)} className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text"><Icon name="plus" size={22} strokeWidth={2.2} /></button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="px-4 pt-1">
            {products && products.length === 0 ? (
              <Empty icon="box" title="Sotish uchun avval tovar qoʻshing." action={<Button icon="plus" onClick={() => nav('/products')}>Tovar qoʻshish</Button>} />
            ) : recent && recent.length > 0 ? (
              <>
                <div className="mb-2 text-[13px] font-medium text-muted">Tez tanlash</div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((id) => byId.get(id)).filter(Boolean).map((p) => (
                    <button key={p!.id} onClick={() => add(p!)} className="press h-10 max-w-full truncate rounded-full border border-line bg-surface px-3.5 text-sm font-medium">{p!.name}</button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* O'ng / past: savat */}
      <div className="lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="mb-2 mt-5 flex items-center justify-between px-4 lg:mt-6">
          <h2 className="font-display text-lg font-semibold">Savat{lines.length ? ` · ${lines.length} ta tovar` : ''}</h2>
          {lines.length > 0 && <button onClick={() => setCart([])} className="text-sm font-medium text-muted">Tozalash</button>}
        </div>
        {lines.length === 0 ? (
          <p className="px-4 text-sm text-muted">Savat boʻsh. Qidiruvdan tovar qoʻshing.</p>
        ) : (
          <ul className="border-t border-line lg:flex-1 lg:overflow-y-auto">
            {lines.map((l) => {
              const p = byId.get(l.productId)
              const st = p ? stockState(p) : 'ok'
              const overs = p ? p.stock - l.qty < 0 : false
              return (
                <li key={l.productId} className="border-b border-line bg-surface px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => setEditLine(l)} className="min-w-0 flex-1 text-left">
                      <div className="line-clamp-2 font-medium leading-snug">{p?.name ?? '—'}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
                        <span className="font-mono tnum">{money(l.price, false)}{l.discount ? ` − ${money(l.discount, false)}` : ''}</span>
                        {(overs || st === 'out' || st === 'negative') && <Chip tone="warn" icon="alert">Hisobda {p?.stock ?? 0}</Chip>}
                      </div>
                    </button>
                    <button aria-label="Olib tashlash" onClick={() => remove(l.productId)} className="press -mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded text-muted hover:text-crit"><Icon name="trash" size={18} /></button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Stepper value={l.qty} onChange={(n) => update(l.productId, { qty: n })} />
                    <span className="font-mono text-base font-medium tnum">{money(lineTotal(l))}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {lines.length > 0 && (
          <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface px-4 pb-3 pt-3 lg:static lg:mt-auto lg:pb-6">
            <div className="mx-auto flex max-w-lg items-center justify-between lg:max-w-none">
              <span className="text-sm text-muted">Jami</span>
              <span className="font-display text-2xl font-bold tnum">{money(total)}</span>
            </div>
            <Button size="lg" full className="mx-auto mt-2 max-w-lg lg:max-w-none" onClick={() => setPayOpen(true)}>Toʻlovga oʻtish · {money(total, false)}</Button>
          </div>
        )}
      </div>

      {/* Qator: narx / chegirma */}
      <Sheet open={!!editLine} onClose={() => setEditLine(null)} title={byId.get(editLine?.productId ?? '')?.name ?? 'Narx'}>
        {editLine && <LineEditor line={editLine} product={byId.get(editLine.productId)} onSave={async (patch) => { await update(editLine.productId, patch); setEditLine(null) }} />}
      </Sheet>

      <Payment open={payOpen} onClose={() => setPayOpen(false)} lines={lines} total={total} onDone={(id) => { setPayOpen(false); nav(`/sell/done/${id}`, { replace: true }) }} />
    </div>
  )
}

function LineEditor({ line, product, onSave }: { line: CartLine; product?: Product; onSave: (p: Partial<CartLine>) => void }) {
  const [price, setPrice] = useState(line.price)
  const [discount, setDiscount] = useState(line.discount)
  const belowCost = product?.costPrice ? price < product.costPrice : false
  return (
    <div className="flex flex-col gap-4 pt-1 pb-2">
      <MoneyField label="Sotish narxi" value={price} onChange={setPrice} autoFocus hint={product ? `Roʻyxatdagi narx: ${money(product.price)}` : undefined} />
      {belowCost && <p className="-mt-2 flex items-center gap-1.5 text-sm text-warn"><Icon name="alert" size={16} />Kelish narxi {money(product!.costPrice!)} dan past.</p>}
      <MoneyField label="Chegirma (qator uchun)" value={discount} onChange={setDiscount} placeholder="0" />
      <p className="text-sm text-muted">Qator jami: <b className="font-mono text-ink tnum">{money(lineTotal({ qty: line.qty, price, discount }))}</b></p>
      <Button size="lg" full onClick={() => onSave({ price, discount })}>Saqlash</Button>
    </div>
  )
}

// ---------- S3.1 To'lov ----------
function Payment({ open, onClose, lines, total, onDone }: { open: boolean; onClose: () => void; lines: CartLine[]; total: number; onDone: (saleId: string) => void }) {
  const toast = useToast()
  const [type, setType] = useState<PaymentType>('cash')
  const [received, setReceived] = useState(0)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [dueDays, setDueDays] = useState(7)
  const [dueDate, setDueDate] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [pickCustomer, setPickCustomer] = useState(false)
  const debt = useLiveQuery(() => (customer ? customerDebt(customer.id) : Promise.resolve(0)), [customer?.id], 0)
  const overdue = useLiveQuery(async () => {
    if (!customer) return 0
    const cs = await db.credits.where('customerId').equals(customer.id).toArray()
    const today = isoDay()
    return cs.filter((c) => c.status !== 'paid' && c.dueDate < today).reduce((s, c) => s + c.amount - c.paid, 0)
  }, [customer?.id], 0)

  useEffect(() => {
    if (!open) return
    db.settings.get('lastPaymentType').then((s) => s?.value && setType(s.value as PaymentType))
    setReceived(0); setCustomer(null); setDueDays(7); setDueDate('')
  }, [open])

  const due = dueDate || isoDay(addDays(new Date(), dueDays))
  const canFinish = lines.length > 0 && (type !== 'credit' || !!customer)

  const finish = async () => {
    if (!canFinish || busy) return
    setBusy(true)
    try {
      const sale = await createSale({ lines, paymentType: type, customerId: customer?.id, received: type === 'cash' && received ? received : undefined, dueDate: type === 'credit' ? due : undefined })
      await db.settings.put({ key: 'lastPaymentType', value: type })
      onDone(sale.id)
    } catch (e) {
      toast({ text: 'Sotuv saqlanmadi. Qayta urinib koʻring.', tone: 'crit' })
    } finally { setBusy(false) }
  }

  const cta = type === 'credit' ? `Nasiyaga berish · ${money(total, false)}` : `Yakunlash · ${money(total, false)}`

  return (
    <Modal open={open} onClose={onClose} title="Toʻlov" closeLabel="Orqaga"
      footer={<><Button size="lg" full onClick={finish} disabled={!canFinish || busy}>{busy ? 'Saqlanmoqda…' : cta}</Button>{type === 'credit' && !customer && <p className="mt-2 text-center text-[13px] text-muted">Mijozni tanlang</p>}</>}>
      <div className="mb-5 text-center">
        <div className="text-[13px] text-muted">Jami</div>
        <div className="font-display text-4xl font-bold tnum">{money(total)}</div>
        <div className="mt-1 text-[13px] text-muted">{lines.length} ta tovar · {lines.reduce((s, l) => s + l.qty, 0)} dona</div>
      </div>
      <div role="radiogroup" aria-label="Toʻlov turi" className="overflow-hidden rounded-lg border border-line">
        {PAY.map((p) => (
          <button key={p.id} role="radio" aria-checked={type === p.id} onClick={() => setType(p.id)}
            className={`flex h-14 w-full items-center gap-3 border-b border-line px-4 text-left last:border-b-0 ${type === p.id ? 'bg-accent-soft' : 'bg-surface hover:bg-surface-2'}`}>
            <Icon name={p.icon} size={22} className={type === p.id ? 'text-accent-text' : 'text-muted'} />
            <span className="flex-1"><span className="block font-medium">{p.label}</span><span className="block text-[13px] text-muted">{p.hint}</span></span>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${type === p.id ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong'}`}>{type === p.id && <Icon name="check" size={12} strokeWidth={3} />}</span>
          </button>
        ))}
      </div>

      {type === 'cash' && (
        <div className="mt-4">
          <MoneyField label="Olingan summa (ixtiyoriy)" value={received} onChange={setReceived} placeholder={money(total, false)} />
          {received > 0 && received >= total && <p className="mt-2 text-sm">Qaytim: <b className="font-mono tnum">{money(received - total)}</b></p>}
          {received > 0 && received < total && <p className="mt-2 text-sm text-crit">Olingan summa jamidan kam.</p>}
        </div>
      )}

      {type === 'credit' && (
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <div className="mb-1.5 text-sm font-medium">Mijoz</div>
            {customer ? (
              <div className="flex items-center gap-3 rounded border border-line bg-surface px-3.5 py-2.5">
                <Icon name="user" size={20} className="text-muted" />
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{customer.name}</div><div className="text-[13px] text-muted">{customer.phone ? phone(customer.phone) : 'Telefon yoʻq'}</div></div>
                <button onClick={() => setPickCustomer(true)} className="text-sm font-medium text-accent-text">Oʻzgartirish</button>
              </div>
            ) : (
              <Button variant="secondary" full icon="user" onClick={() => setPickCustomer(true)}>Mijozni tanlash</Button>
            )}
            {customer && debt > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <Chip tone={overdue > 0 ? 'crit' : 'warn'} icon={overdue > 0 ? 'alert' : 'clock'}>Hozirgi qarzi: {money(debt)}</Chip>
                {overdue > 0 && <Chip tone="crit">Muddati oʻtgan: {money(overdue)}</Chip>}
              </div>
            )}
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium">Muddat</div>
            <div className="flex flex-wrap gap-2">
              {DUE.map((d) => <button key={d} onClick={() => { setDueDays(d); setDueDate('') }} aria-pressed={!dueDate && dueDays === d} className={`press h-10 rounded-full border px-4 text-sm font-medium ${!dueDate && dueDays === d ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-surface'}`}>{d} kun</button>)}
              <label className={`inline-flex h-10 cursor-pointer items-center gap-1 rounded-full border px-3 text-sm font-medium ${dueDate ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-surface'}`}>
                <Icon name="calendar" size={16} />Sana
                <input type="date" value={dueDate} min={isoDay()} onChange={(e) => setDueDate(e.target.value)} className="w-0 opacity-0" aria-label="Muddat sanasi" />
              </label>
            </div>
            <p className="mt-2 text-sm text-muted">Toʻlov muddati: <b className="font-mono text-ink">{dateShort(due + 'T00:00:00')}</b></p>
          </div>
        </div>
      )}

      <CustomerPicker open={pickCustomer} onClose={() => setPickCustomer(false)} onPick={(c) => { setCustomer(c); setPickCustomer(false) }} />
    </Modal>
  )
}

// ---------- Mijoz tanlash / yaratish ----------
export function CustomerPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (c: Customer) => void }) {
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [ph, setPh] = useState('')
  const customers = useLiveQuery(() => db.customers.where('status').equals('active').sortBy('name'), [])
  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!customers) return []
    if (!n) return customers
    return customers.filter((c) => c.name.toLowerCase().includes(n) || (c.phone ?? '').includes(n.replace(/\D/g, '')))
  }, [customers, q])
  useEffect(() => { if (open) { setQ(''); setCreating(false); setName(''); setPh('') } }, [open])

  const create = async () => {
    if (name.trim().length < 2) return
    const c = await addCustomer({ name, phone: ph.replace(/\D/g, '').length >= 12 ? phoneDigits(ph) : undefined })
    onPick(c)
  }

  return (
    <Sheet open={open} onClose={onClose} title={creating ? 'Yangi mijoz' : 'Mijoz'}
      footer={creating ? <Button size="lg" full onClick={create} disabled={name.trim().length < 2}>Saqlash va tanlash</Button> : undefined}>
      {creating ? (
        <div className="flex flex-col gap-4 pt-1">
          <Field label="Ismi *" value={name} onChange={setName} placeholder="Sherzod usta" autoFocus />
          <Field label="Telefon" value={ph} onChange={(v) => setPh(v ? phoneMask(v) : '')} inputMode="tel" placeholder="+998 __ ___-__-__" mono hint="Eslatma yuborish uchun" />
          <button onClick={() => setCreating(false)} className="self-start text-sm font-medium text-accent-text">← Roʻyxatga qaytish</button>
        </div>
      ) : (
        <div className="pt-1">
          <Field value={q} onChange={setQ} placeholder="Ism yoki telefon…" autoFocus />
          <button onClick={() => { setCreating(true); setName(q) }} className="mt-3 flex h-11 w-full items-center gap-2 rounded px-2 text-left font-medium text-accent-text hover:bg-accent-soft"><Icon name="plus" size={18} />Yangi mijoz{q ? `: „${q}“` : ''}</button>
          <ul className="mt-1">
            {list.map((c) => (
              <li key={c.id}><button onClick={() => onPick(c)} className="flex h-12 w-full items-center gap-3 rounded px-2 text-left hover:bg-surface-2"><Icon name="user" size={18} className="text-muted" /><span className="flex-1 truncate">{c.name}</span><span className="font-mono text-[13px] text-muted">{c.phone ? phone(c.phone) : ''}</span></button></li>
            ))}
            {customers && list.length === 0 && q && <li className="px-2 py-3 text-sm text-muted">Topilmadi — yuqoridan yangi mijoz qoʻshing.</li>}
          </ul>
        </div>
      )}
    </Sheet>
  )
}
