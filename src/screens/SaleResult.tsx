import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { dateShort, money, time } from '@/lib/format'
import { payLabel, receiptText, shareText } from '@/lib/receipt'
import { Button } from '@/components/ui'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { useOnline } from '@/components/Shell'

// S3.2 — replace: orqaga bosilsa bo'sh savatga qaytadi, yakunlangan sotuvga emas
export default function SaleResult() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const online = useOnline()
  const sale = useLiveQuery(() => db.sales.get(id), [id])
  const credit = useLiveQuery(() => db.credits.where('saleId').equals(id).first(), [id])
  const customer = useLiveQuery(() => (sale?.customerId ? db.customers.get(sale.customerId) : undefined), [sale?.customerId])
  const debt = useLiveQuery(async () => {
    if (!sale?.customerId) return 0
    const cs = await db.credits.where('customerId').equals(sale.customerId).toArray()
    return cs.reduce((s, c) => s + c.amount - c.paid, 0)
  }, [sale?.customerId], 0)

  useEffect(() => {
    // Android "orqaga" — bo'sh savatga (tarix stekidan yakunlangan sotuvni olib tashlaymiz)
    const onPop = () => nav('/sell', { replace: true })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [nav])

  if (!sale) return null

  const share = async () => {
    const r = await shareText(await receiptText(sale))
    if (r === 'copied') toast({ text: 'Chek matni nusxalandi' })
    if (r === 'failed') toast({ text: 'Ulashib boʻlmadi', tone: 'crit' })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-6 pt-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-good-soft text-good"><Icon name="check" size={32} strokeWidth={2.5} /></div>
      <h1 className="mt-4 font-display text-2xl font-bold">Sotuv qayd qilindi</h1>
      <div className="mt-2 font-display text-4xl font-bold tnum">{money(sale.total)}</div>
      <p className="mt-1 text-sm text-muted">{payLabel(sale.paymentType)} · Chek № {sale.number} · {dateShort(sale.createdAt)} {time(sale.createdAt)}</p>
      {sale.paymentType === 'cash' && sale.received && sale.received > sale.total && <p className="mt-2 text-sm">Qaytim: <b className="font-mono tnum">{money(sale.received - sale.total)}</b></p>}
      {sale.paymentType === 'credit' && credit && customer && (
        <div className="mt-4 rounded-lg border border-warn bg-warn-soft px-4 py-3 text-left text-sm text-ink">
          <div className="font-medium">{customer.name} qarzi: <span className="font-mono tnum">{money(debt)}</span></div>
          <div className="text-muted">Bu sotuv: {money(credit.amount)} · muddat {dateShort(credit.dueDate + 'T00:00:00')}</div>
        </div>
      )}
      {!online && <p className="mt-3 inline-flex items-center justify-center gap-1.5 text-sm text-warn"><Icon name="wifiOff" size={16} />Internet tiklanganda yuboriladi</p>}

      <div className="mt-auto flex flex-col gap-2 pt-10">
        <Button size="lg" full icon="cart" onClick={() => nav('/sell', { replace: true })}>Yangi sotuv</Button>
        <Button size="lg" full variant="secondary" icon="share" onClick={share}>Chekni ulashish</Button>
        <Button size="lg" full variant="ghost" onClick={() => nav(`/more/sales/${sale.id}`, { replace: true })}>Sotuvni ochish</Button>
      </div>
    </div>
  )
}
