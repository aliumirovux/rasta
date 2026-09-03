import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { addToCart, applyMovement, db, stockState, updateProduct, type MovementType } from '@/lib/db'
import { dayLabel, money, time } from '@/lib/format'
import { Header } from '@/components/Shell'
import { Button, Chip, Field, IconButton, Select, Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { StockChip } from './Products'
import { ProductForm } from './ProductForm'

const mvLabel: Record<MovementType, string> = { in: 'Kirim', sale: 'Sotuv', return: 'Qaytarish', adjust: 'Tuzatish' }
const REASONS = ['Inventarizatsiya', 'Kirim (taʼminotchidan)', 'Brak / hisobdan chiqarish', 'Boshqa'] as const

export default function ProductCard() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const p = useLiveQuery(() => db.products.get(id), [id])
  const moves = useLiveQuery(() => db.movements.where('productId').equals(id).reverse().sortBy('createdAt'), [id])
  const [edit, setEdit] = useState(false)
  const [adjust, setAdjust] = useState(false)
  const [archiveAsk, setArchiveAsk] = useState(false)
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState<string>(REASONS[0])

  if (p === undefined) return <div className="p-4"><div className="h-40 animate-pulse rounded-lg bg-surface-2" /></div>
  if (p === null || !p) return <div className="p-6 text-center text-muted">Tovar topilmadi.</div>

  const margin = p.costPrice ? p.price - p.costPrice : undefined
  const st = stockState(p)

  const sell = async () => { await addToCart(p.id, p.price); nav('/sell') }
  const doAdjust = async () => {
    const n = parseInt(qty, 10)
    if (!n) return
    const type: MovementType = reason.startsWith('Kirim') ? 'in' : 'adjust'
    await applyMovement({ productId: p.id, type, qty: n, reason })
    setAdjust(false); setQty('')
    toast({ text: `Qoldiq: ${p.stock + n} ${p.unit}` })
  }
  const archive = async () => { await updateProduct(p.id, { status: 'archived' }); setArchiveAsk(false); toast({ text: 'Arxivlandi' }); nav('/products') }
  const restore = async () => { await updateProduct(p.id, { status: 'active' }); toast({ text: 'Qaytarildi' }) }

  return (
    <div>
      <Header title={p.name} back="/products" right={<><IconButton icon="edit" label="Tahrirlash" onClick={() => setEdit(true)} /><IconButton icon="archive" label="Arxivlash" onClick={() => setArchiveAsk(true)} /></>} />
      {p.status === 'archived' && (
        <div className="flex items-center justify-between bg-neutral-soft px-4 py-2 text-sm text-neutral">Arxivda — qidiruvda chiqmaydi<button onClick={restore} className="font-medium text-accent">Qaytarish</button></div>
      )}
      <div className="px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          {p.sku && <button onClick={() => { navigator.clipboard?.writeText(p.sku!); toast({ text: 'Artikul nusxalandi' }) }} className="inline-flex items-center gap-1 font-mono text-ink"><span>{p.sku}</span></button>}
          {p.brand && <span>· {p.brand}</span>}
          {p.category && <span>· {p.category}</span>}
        </div>
        {p.models.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{p.models.map((m) => <Chip key={m} tone="outline">{m}</Chip>)}</div>}

        <div className="mt-4 rounded-lg border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[13px] text-muted">Qoldiq</div>
              <div className={`font-display text-4xl font-bold leading-none tnum ${st === 'out' || st === 'negative' ? 'text-crit' : ''}`}>{p.stock} <span className="text-lg font-semibold text-muted">{p.unit}</span></div>
              <div className="mt-2 flex items-center gap-2"><StockChip p={p} />{st === 'negative' && <button onClick={() => setAdjust(true)} className="text-sm font-medium text-accent">Tuzating</button>}</div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setAdjust(true)}>Tuzatish</Button>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
            <div><dt className="text-muted">Sotish narxi</dt><dd className="font-mono font-medium tnum">{money(p.price)}</dd></div>
            <div><dt className="text-muted">Kelish narxi</dt><dd className="font-mono tnum">{p.costPrice ? money(p.costPrice) : <span className="text-muted">—</span>}</dd></div>
            {margin !== undefined && <div><dt className="text-muted">Marja</dt><dd className={`font-mono tnum ${margin < 0 ? 'text-crit' : ''}`}>{money(margin)}</dd></div>}
            <div><dt className="text-muted">Min qoldiq</dt><dd className="font-mono tnum">{p.minStock} {p.unit}</dd></div>
          </dl>
        </div>
        <Button size="lg" full icon="cart" className="mt-4" onClick={sell}>Sotish</Button>

        <h2 className="mb-2 mt-6 font-display text-lg font-semibold">Harakatlar</h2>
        {!moves?.length ? <p className="text-sm text-muted">Hali harakat yoʻq.</p> : (
          <ul className="overflow-hidden rounded-lg border border-line bg-surface">
            {moves.slice(0, 10).map((m) => (
              <li key={m.id} className="flex items-center gap-3 border-b border-line px-3.5 py-2.5 text-sm last:border-b-0">
                <div className="flex-1"><div className="font-medium">{mvLabel[m.type]}{m.reason ? ` · ${m.reason}` : ''}</div><div className="text-[13px] text-muted">{dayLabel(m.createdAt)} {time(m.createdAt)}</div></div>
                <span className={`font-mono font-medium tnum ${m.qty < 0 ? 'text-crit' : 'text-good'}`}>{m.qty > 0 ? '+' : '−'}{Math.abs(m.qty)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProductForm open={edit} onClose={() => setEdit(false)} edit={p} />

      <Sheet open={adjust} onClose={() => setAdjust(false)} title="Qoldiqni tuzatish" footer={<Button size="lg" full onClick={doAdjust} disabled={!parseInt(qty, 10)}>Saqlash</Button>}>
        <div className="flex flex-col gap-4 pt-1">
          <p className="text-sm text-muted">Hozir: <b className="font-mono text-ink">{p.stock} {p.unit}</b>. Qoʻshish uchun musbat, ayirish uchun manfiy son.</p>
          <Field label="Miqdor (±)" value={qty} onChange={setQty} inputMode="numeric" mono placeholder="+5 yoki -2" suffix={p.unit} autoFocus />
          <Select label="Sabab" value={reason} onChange={setReason} options={REASONS} />
          {parseInt(qty, 10) ? <p className="text-sm">Yangi qoldiq: <b className="font-mono tnum">{p.stock + parseInt(qty, 10)} {p.unit}</b></p> : null}
        </div>
      </Sheet>

      <Sheet open={archiveAsk} onClose={() => setArchiveAsk(false)} title="Arxivlash">
        <p className="pt-1 text-[15px]">«{p.name}» ni arxivlaysizmi? Qoldiq {p.stock} {p.unit} saqlanadi, tovar qidiruvda chiqmaydi.</p>
        <div className="mt-4 flex gap-2 pb-2"><Button variant="secondary" full onClick={() => setArchiveAsk(false)}>Bekor qilish</Button><Button variant="danger" full onClick={archive}>Arxivlash</Button></div>
      </Sheet>
    </div>
  )
}
