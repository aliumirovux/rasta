import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, receivePayment, type PaymentType } from '@/lib/db'
import { dateShort, dayLabel, daysUntil, isoDay, money, phone, time } from '@/lib/format'
import { shareText } from '@/lib/receipt'
import { Header } from '@/components/Shell'
import { Button, Chip, Field, IconButton, MoneyField, Sheet } from '@/components/ui'
import { Icon, type IconName } from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { summarize, DebtChip } from './Credit'

type Tab = 'credits' | 'payments' | 'sales'
const METHODS: { id: Exclude<PaymentType, 'credit'>; label: string; icon: IconName }[] = [
  { id: 'cash', label: 'Naqd', icon: 'cash' }, { id: 'card', label: 'Karta', icon: 'card' }, { id: 'transfer', label: 'Oʻtkazma', icon: 'transfer' },
]

export default function CustomerCard() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('credits')
  const [paying, setPaying] = useState(false)
  const customer = useLiveQuery(() => db.customers.get(id), [id])
  const credits = useLiveQuery(() => db.credits.where('customerId').equals(id).reverse().sortBy('createdAt'), [id])
  const payments = useLiveQuery(() => db.payments.where('customerId').equals(id).reverse().sortBy('createdAt'), [id])
  const sales = useLiveQuery(() => db.sales.where('customerId').equals(id).reverse().sortBy('createdAt'), [id])
  const store = useLiveQuery(() => db.settings.get('store'), [])
  const row = useMemo(() => (customer && credits ? summarize([customer], credits)[0] : undefined), [customer, credits])

  if (!customer || !row) return <div className="p-4"><div className="h-40 animate-pulse rounded-lg bg-surface-2" /></div>

  const remind = async () => {
    const storeName = (store?.value as { name?: string } | undefined)?.name ?? 'Doʻkon'
    const due = row.overdueDays > 0 ? 'muddati oʻtgan' : row.nextDue ? `muddati ${dateShort(row.nextDue + 'T00:00:00')}` : ''
    const text = `Assalomu alaykum, ${customer.name}. «${storeName}» doʻkonidan eslatma: qarzingiz ${money(row.debt)}${due ? ', ' + due : ''}. Rahmat.`
    const r = await shareText(text, 'Eslatma')
    if (r === 'copied') toast({ text: 'Eslatma matni nusxalandi' })
  }

  return (
    <div>
      <Header title={customer.name} back="/credit" sub={customer.kind === 'usta' ? 'Usta' : customer.kind === 'dokon' ? 'Doʻkon' : 'Mijoz'}
        right={customer.phone ? <IconButton icon="phone" label="Qoʻngʻiroq" onClick={() => (window.location.href = `tel:+${customer.phone}`)} /> : undefined} />
      <div className="px-4 pt-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-[13px] text-muted">Qarz balansi</div>
          <div className={`font-display text-4xl font-bold tnum ${row.overdueDays > 0 ? 'text-crit' : ''}`}>{money(row.debt)}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2"><DebtChip r={row} />{customer.phone && <span className="font-mono text-[13px] text-muted">{phone(customer.phone)}</span>}</div>
          <div className="mt-4 flex gap-2">
            <Button full icon="cash" onClick={() => setPaying(true)} disabled={row.debt <= 0} title={row.debt <= 0 ? 'Ochiq qarz yoʻq' : undefined}>Toʻlov qabul qilish</Button>
            <Button full variant="secondary" icon="share" onClick={remind} disabled={row.debt <= 0}>Eslatma</Button>
          </div>
          {row.debt <= 0 && <p className="mt-2 text-[13px] text-muted">Ochiq qarz yoʻq.</p>}
        </div>

        <div className="mt-5 flex border-b border-line" role="tablist">
          {([['credits', 'Qarzlar'], ['payments', 'Toʻlovlar'], ['sales', 'Sotuvlar']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`h-11 flex-1 border-b-2 text-[15px] font-medium ${tab === k ? 'border-accent text-accent' : 'border-transparent text-muted'}`}>{l}</button>
          ))}
        </div>

        {tab === 'credits' && (
          <ul className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
            {credits?.length ? credits.map((c) => {
              const left = c.amount - c.paid
              const d = daysUntil(c.dueDate)
              const tone = c.status === 'paid' ? 'good' : d < 0 ? 'crit' : c.status === 'partial' ? 'neutral' : 'warn'
              const label = c.status === 'paid' ? 'Toʻlangan' : d < 0 ? `Muddati oʻtgan · ${-d} kun` : c.status === 'partial' ? `Qisman · ${money(left, false)} qoldi` : `Ochiq · ${dateShort(c.dueDate + 'T00:00:00')} gacha`
              return (
                <li key={c.id} className="flex items-center gap-3 border-b border-line px-3.5 py-2.5 last:border-b-0">
                  <button onClick={() => nav(`/more/sales/${c.saleId}`)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2 text-sm"><span className="font-medium">{dayLabel(c.createdAt)}</span><span className="text-muted">· muddat {dateShort(c.dueDate + 'T00:00:00')}</span></div>
                    <div className="mt-1"><Chip tone={tone} icon={tone === 'good' ? 'check' : tone === 'crit' ? 'alert' : 'clock'}>{label}</Chip></div>
                  </button>
                  <div className="text-right"><div className="font-mono font-medium tnum">{money(c.amount, false)}</div>{c.paid > 0 && c.status !== 'paid' && <div className="text-[12px] text-muted tnum">toʻlangan {money(c.paid, false)}</div>}</div>
                </li>
              )
            }) : <li className="px-4 py-6 text-center text-sm text-muted">Qarz yozuvlari yoʻq.</li>}
          </ul>
        )}
        {tab === 'payments' && (
          <ul className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
            {payments?.length ? payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 border-b border-line px-3.5 py-2.5 text-sm last:border-b-0">
                <span className="flex-1"><span className="block font-medium">{dayLabel(p.createdAt)} {time(p.createdAt)}</span><span className="block text-[13px] text-muted">{METHODS.find((m) => m.id === p.method)?.label}{p.note ? ` · ${p.note}` : ''}</span></span>
                <span className="font-mono font-medium text-good tnum">+{money(p.amount, false)}</span>
              </li>
            )) : <li className="px-4 py-6 text-center text-sm text-muted">Toʻlovlar yoʻq.</li>}
          </ul>
        )}
        {tab === 'sales' && (
          <ul className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
            {sales?.length ? sales.map((s) => (
              <li key={s.id}><button onClick={() => nav(`/more/sales/${s.id}`)} className="flex w-full items-center gap-3 border-b border-line px-3.5 py-2.5 text-left text-sm last:border-b-0 hover:bg-surface-2">
                <span className="min-w-0 flex-1"><span className="block truncate">{s.lines[0]?.name}{s.lines.length > 1 ? ` +${s.lines.length - 1}` : ''}</span><span className="block text-[13px] text-muted">{dayLabel(s.createdAt)} · № {s.number}</span></span>
                <span className="font-mono font-medium tnum">{money(s.total, false)}</span>
              </button></li>
            )) : <li className="px-4 py-6 text-center text-sm text-muted">Sotuvlar yoʻq.</li>}
          </ul>
        )}
      </div>

      <ReceivePayment open={paying} onClose={() => setPaying(false)} customerId={customer.id} debt={row.debt} credits={credits ?? []} />
    </div>
  )
}

// S4.2 — To'lov qabul qilish (FIFO)
function ReceivePayment({ open, onClose, customerId, debt, credits }: { open: boolean; onClose: () => void; customerId: string; debt: number; credits: { id: string; amount: number; paid: number; status: string; createdAt: number }[] }) {
  const toast = useToast()
  const [amount, setAmount] = useState(debt)
  const [method, setMethod] = useState<Exclude<PaymentType, 'credit'>>('cash')
  const [date, setDate] = useState(isoDay())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setAmount(debt); setMethod('cash'); setDate(isoDay()); setNote('') } }, [open, debt])
  const err = amount > debt ? `Qarzdan koʻp: qarz ${money(debt)}.` : undefined

  // Taqsimot ko'rinishi: eng eski qarzdan
  const alloc = useMemo(() => {
    let left = amount
    return credits.filter((c) => c.status !== 'paid').sort((a, b) => a.createdAt - b.createdAt).map((c) => {
      const take = Math.max(0, Math.min(c.amount - c.paid, left)); left -= take
      return { id: c.id, createdAt: c.createdAt, take }
    }).filter((x) => x.take > 0)
  }, [amount, credits])

  const submit = async () => {
    if (!amount || err || busy) return
    setBusy(true)
    try {
      await receivePayment({ customerId, amount, method, createdAt: new Date(date + 'T12:00:00').getTime(), note: note || undefined })
      toast({ text: `${money(amount)} qabul qilindi` })
      onClose()
    } catch { toast({ text: 'Saqlanmadi. Qayta urinib koʻring.', tone: 'crit' }) } finally { setBusy(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Toʻlov qabul qilish"
      footer={<Button size="lg" full onClick={submit} disabled={!amount || !!err || busy}>{busy ? 'Saqlanmoqda…' : `Qabul qilish · ${money(amount, false)}`}</Button>}>
      <div className="flex flex-col gap-4 pt-1">
        <div>
          <MoneyField label="Summa" value={amount} onChange={setAmount} error={err} autoFocus />
          <div className="mt-2 flex gap-2"><button onClick={() => setAmount(debt)} className="h-9 rounded-full border border-line bg-surface px-3 text-sm font-medium">Toʻliq · {money(debt, false)}</button></div>
        </div>
        <div>
          <div className="mb-1.5 text-sm font-medium">Usul</div>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => <button key={m.id} onClick={() => setMethod(m.id)} aria-pressed={method === m.id} className={`press flex h-11 items-center justify-center gap-1.5 rounded border text-sm font-medium ${method === m.id ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface'}`}><Icon name={m.icon} size={16} />{m.label}</button>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium" htmlFor="pay-date">Sana</label><input id="pay-date" type="date" value={date} max={isoDay()} onChange={(e) => setDate(e.target.value)} className="h-12 rounded border border-line bg-surface px-3 font-mono text-base outline-none focus:border-accent" /></div>
          <Field label="Izoh" value={note} onChange={setNote} placeholder="ixtiyoriy" />
        </div>
        {alloc.length > 0 && (
          <div className="rounded border border-line bg-surface-2 px-3 py-2 text-[13px] text-muted">
            Eng eski qarzdan boshlab yopiladi: {alloc.map((a) => `${dayLabel(a.createdAt)} — ${money(a.take, false)}`).join(', ')}
          </div>
        )}
      </div>
    </Sheet>
  )
}
