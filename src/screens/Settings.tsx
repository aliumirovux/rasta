import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, setSetting } from '@/lib/db'
import { phoneDigits, phoneMask } from '@/lib/format'
import { Header } from '@/components/Shell'
import { Button, Chip, Field, Row } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { Icon } from '@/components/Icon'

interface Store { name?: string; market?: string; phone?: string }

export default function Settings() {
  const toast = useToast()
  const store = useLiveQuery(() => db.settings.get('store'), [])
  const [name, setName] = useState('')
  const [market, setMarket] = useState('')
  const [ph, setPh] = useState('')
  useEffect(() => { const s = (store?.value as Store | undefined) ?? {}; setName(s.name ?? ''); setMarket(s.market ?? ''); setPh(s.phone ? phoneMask(s.phone) : '') }, [store])

  const save = async () => {
    await setSetting('store', { name: name.trim(), market: market.trim(), phone: ph.replace(/\D/g, '').length >= 12 ? phoneDigits(ph) : undefined })
    toast({ text: 'Saqlandi' })
  }
  const exportJson = async () => {
    const data = { products: await db.products.toArray(), movements: await db.movements.toArray(), sales: await db.sales.toArray(), customers: await db.customers.toArray(), credits: await db.credits.toArray(), payments: await db.payments.toArray(), exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: `rasta-${new Date().toISOString().slice(0, 10)}.json` })
    a.click(); URL.revokeObjectURL(url)
  }
  const reset = async () => {
    if (!window.confirm('Barcha lokal maʼlumotlar oʻchiriladi (tovarlar, sotuvlar, nasiya). Davom etasizmi?')) return
    await db.delete(); window.location.reload()
  }

  return (
    <div>
      <Header title="Sozlamalar" back="/more" />
      <div className="flex flex-col gap-4 px-4 pt-4">
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="font-display text-lg font-semibold">Doʻkon</h2>
          <p className="mb-3 text-[13px] text-muted">Chekda chiqadi.</p>
          <div className="flex flex-col gap-3">
            <Field label="Nomi" value={name} onChange={setName} placeholder="Sherzod avto" />
            <Field label="Bozor / manzil" value={market} onChange={setMarket} placeholder="Sergeli avtobozori, 14-rasta" />
            <Field label="Telefon" value={ph} onChange={(v) => setPh(v ? phoneMask(v) : '')} inputMode="tel" mono placeholder="+998 __ ___-__-__" />
            <Button onClick={save} disabled={name.trim().length < 2}>Saqlash</Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-line">
          <Row><span className="flex-1"><span className="block font-medium">Excel import</span><span className="block text-[13px] text-muted">Shablon va ustunlarni moslashtirish</span></span><Chip tone="outline">Tez kunda</Chip></Row>
          <Row><span className="flex-1"><span className="block font-medium">Xodimlar</span><span className="block text-[13px] text-muted">Ega / sotuvchi rollari</span></span><Chip tone="outline">MVP-2</Chip></Row>
          <Row onClick={() => toast({ text: 'Qiziqish qayd qilindi — pilotda soʻraymiz' })}><span className="flex-1"><span className="block font-medium">Onlayn-kassa</span><span className="block text-[13px] text-muted">Fiskal chek, ОФД</span></span><Chip tone="outline">Tez kunda</Chip></Row>
        </section>

        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="font-display text-lg font-semibold">Maʼlumotlar</h2>
          <p className="mb-3 text-[13px] text-muted">Maʼlumotlaringiz sizniki — istalgan vaqt yuklab oling.</p>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" icon="file" onClick={exportJson}>JSON yuklab olish</Button>
            <Button variant="danger" icon="trash" onClick={reset}>Lokal maʼlumotlarni tozalash</Button>
          </div>
        </section>

        <p className="flex items-center justify-center gap-1.5 pb-4 text-[12px] text-muted"><Icon name="cloud" size={14} />Sinxronizatsiya (Supabase) — keyingi bosqich; hozir hammasi telefonda saqlanadi.</p>
      </div>
    </div>
  )
}
