import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, lineTotal, returnSale } from '@/lib/db'
import { dateShort, money, time } from '@/lib/format'
import { payLabel, receiptText, shareText } from '@/lib/receipt'
import { Header } from '@/components/Shell'
import { Button, Chip, Modal, Select, Stepper } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { Icon } from '@/components/Icon'

const REASONS = ['Brak', 'Notoʻgʻri qism', 'Mijoz fikridan qaytdi', 'Boshqa'] as const

export default function SaleDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const sale = useLiveQuery(() => db.sales.get(id), [id])
  const credit = useLiveQuery(() => db.credits.where('saleId').equals(id).first(), [id])
  const customer = useLiveQuery(() => (sale?.customerId ? db.customers.get(sale.customerId) : undefined), [sale?.customerId])
  const [ret, setRet] = useState(false)

  if (!sale) return <div className="p-6 text-center text-muted">Sotuv topilmadi.</div>
  const share = async () => { const r = await shareText(await receiptText(sale)); if (r === 'copied') toast({ text: 'Chek matni nusxalandi' }) }
  const statusChip = sale.status === 'done' ? <Chip tone="good" icon="check">Yakunlangan</Chip> : sale.status === 'partial_return' ? <Chip tone="neutral">Qisman qaytarilgan</Chip> : <Chip tone="outline">Qaytarilgan</Chip>

  return (
    <div>
      <Header title={`Chek № ${sale.number}`} back sub={`${dateShort(sale.createdAt)} ${time(sale.createdAt)}`} />
      <div className="px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">{statusChip}<Chip tone="outline">{payLabel(sale.paymentType)}</Chip>{sale.synced === 0 && <Chip tone="neutral" icon="cloud">Yuborilmoqda</Chip>}</div>
        {customer && (
          <button onClick={() => nav(`/credit/${customer.id}`)} className="mt-3 flex w-full items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-left">
            <Icon name="user" size={20} className="text-muted" />
            <span className="flex-1"><span className="block font-medium">{customer.name}</span>{credit && <span className="block text-[13px] text-muted">Nasiya · muddat {dateShort(credit.dueDate + 'T00:00:00')} · {credit.status === 'paid' ? 'toʻlangan' : `qoldi ${money(credit.amount - credit.paid, false)}`}</span>}</span>
            <Icon name="chevronRight" size={18} className="text-line-strong" />
          </button>
        )}
        <ul className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
          {sale.lines.map((l, i) => (
            <li key={i} className={`flex items-start gap-3 border-b border-line px-3.5 py-2.5 last:border-b-0 ${l.qty === 0 ? 'opacity-50' : ''}`}>
              <span className="min-w-0 flex-1"><span className="block font-medium leading-snug">{l.name}</span><span className="block font-mono text-[13px] text-muted tnum">{l.sku ? l.sku + ' · ' : ''}{l.qty} × {money(l.price, false)}{l.discount ? ` − ${money(l.discount, false)}` : ''}</span></span>
              <span className="font-mono font-medium tnum">{money(lineTotal(l), false)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between bg-surface-2 px-3.5 py-3"><span className="font-medium">Jami</span><span className="font-display text-xl font-bold tnum">{money(sale.total)}</span></li>
        </ul>
        {sale.received && sale.received > 0 && <p className="mt-2 text-sm text-muted">Olindi {money(sale.received)} · qaytim {money(Math.max(0, sale.received - sale.total))}</p>}
        <div className="mt-4 flex gap-2">
          <Button full variant="secondary" icon="share" onClick={share}>Chekni ulashish</Button>
          <Button full variant="secondary" icon="refresh" onClick={() => setRet(true)} disabled={sale.status === 'returned'} title={sale.status === 'returned' ? 'Hammasi qaytarilgan' : undefined}>Qaytarish</Button>
        </div>
        {sale.status === 'returned' && <p className="mt-2 text-center text-[13px] text-muted">Hammasi qaytarilgan.</p>}
      </div>
      <ReturnModal open={ret} onClose={() => setRet(false)} saleId={sale.id} lines={sale.lines} isCredit={sale.paymentType === 'credit'} creditPaid={credit ? credit.paid > 0 : false} />
    </div>
  )
}

function ReturnModal({ open, onClose, saleId, lines, isCredit, creditPaid }: { open: boolean; onClose: () => void; saleId: string; lines: { productId: string; name: string; qty: number; price: number; discount: number }[]; isCredit: boolean; creditPaid: boolean }) {
  const toast = useToast()
  const [qty, setQty] = useState<Record<string, number>>({})
  const [reason, setReason] = useState<string>(REASONS[0])
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setQty({}); setReason(REASONS[0]) } }, [open])
  const sum = lines.reduce((s, l) => { const q = qty[l.productId] ?? 0; const ud = l.qty ? l.discount / l.qty : 0; return s + q * (l.price - ud) }, 0)
  const count = Object.values(qty).reduce((s, q) => s + q, 0)
  const submit = async () => {
    if (!count || busy) return
    setBusy(true)
    try { await returnSale(saleId, Object.entries(qty).map(([productId, q]) => ({ productId, qty: q })), reason); toast({ text: `Qaytarildi · ${money(Math.round(sum))}` }); onClose() }
    catch { toast({ text: 'Saqlanmadi. Qayta urinib koʻring.', tone: 'crit' }) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title="Qaytarish" footer={<Button size="lg" full disabled={!count || busy} onClick={submit}>{busy ? 'Saqlanmoqda…' : `Qaytarish · ${money(Math.round(sum), false)} · ${count} ta`}</Button>}>
      <ul className="overflow-hidden rounded-lg border border-line">
        {lines.filter((l) => l.qty > 0).map((l) => (
          <li key={l.productId} className="flex items-center gap-3 border-b border-line bg-surface px-3.5 py-2.5 last:border-b-0">
            <span className="min-w-0 flex-1"><span className="block font-medium leading-snug">{l.name}</span><span className="block text-[13px] text-muted">sotilgan: {l.qty} · {money(l.price, false)}</span></span>
            <Stepper min={0} value={qty[l.productId] ?? 0} onChange={(n) => setQty((q) => ({ ...q, [l.productId]: Math.min(l.qty, n) }))} />
          </li>
        ))}
      </ul>
      <div className="mt-4"><Select label="Sabab" value={reason} onChange={setReason} options={REASONS} /></div>
      <p className="mt-3 text-sm text-muted">{isCredit ? (creditPaid ? 'Qarz qisman toʻlangan — qaytarilgan summa qarzdan ayriladi, ortiqchasi naqd qaytariladi.' : 'Nasiya — qaytarilgan summa mijoz qarzidan ayriladi.') : 'Pul mijozga naqd qaytariladi.'} Qoldiq tovarlarga qaytadi.</p>
    </Modal>
  )
}
