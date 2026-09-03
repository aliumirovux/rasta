import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, normText, normSku, stockState, type Product } from '@/lib/db'
import { money } from '@/lib/format'
import { CATEGORIES, CAR_MODELS } from '@/lib/catalog'
import { Header } from '@/components/Shell'
import { Button, Chip, Empty, FilterChip, Row, Sheet } from '@/components/ui'
import { Icon } from '@/components/Icon'
import { ProductForm } from './ProductForm'

export type StockFilter = 'all' | 'low' | 'out'

/** Qidiruv — nom (har so'z prefiksi), artikul (normalizatsiya), model tegi; kirill ↔ lotin */
export function searchProducts(items: Product[], q: string): Product[] {
  const nq = normText(q)
  if (!nq) return items
  const sq = normSku(q) ?? ''
  const words = nq.split(' ').filter(Boolean)
  return items.filter((p) => {
    const name = normText(p.name)
    const models = p.models.map(normText).join(' ')
    const hay = name + ' ' + models + ' ' + normText(p.brand ?? '')
    const byWords = words.every((w) => hay.split(' ').some((h) => h.startsWith(w)) || hay.includes(w))
    const bySku = !!p.skuNorm && sq.length >= 3 && p.skuNorm.includes(sq)
    return byWords || bySku
  })
}

export function StockChip({ p }: { p: Pick<Product, 'stock' | 'minStock'> }) {
  const s = stockState(p)
  if (s === 'ok') return null
  if (s === 'low') return <Chip tone="warn" icon="alert">Kam qoldi</Chip>
  if (s === 'out') return <Chip tone="crit" icon="alert">Tugagan</Chip>
  return <Chip tone="crit" icon="alert">Hisobda {p.stock}</Chip>
}

export default function Products() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [model, setModel] = useState('')
  const stockF = (params.get('stock') as StockFilter) || 'all'
  const [pick, setPick] = useState<null | 'cat' | 'model'>(null)
  const [adding, setAdding] = useState(() => params.get('add') === '1')
  const closeAdd = () => {
    setAdding(false)
    if (params.get('add')) { params.delete('add'); setParams(params, { replace: true }) }
  }

  const all = useLiveQuery(() => db.products.where('status').equals('active').sortBy('name'), [])
  const list = useMemo(() => {
    if (!all) return []
    let xs = searchProducts(all, q)
    if (cat) xs = xs.filter((p) => p.category === cat)
    if (model) xs = xs.filter((p) => p.models.includes(model))
    if (stockF === 'low') xs = xs.filter((p) => ['low', 'out', 'negative'].includes(stockState(p)))
    if (stockF === 'out') xs = xs.filter((p) => ['out', 'negative'].includes(stockState(p)))
    return xs
  }, [all, q, cat, model, stockF])

  const setStock = (v: StockFilter) => setParams(v === 'all' ? {} : { stock: v }, { replace: true })
  const hasFilter = !!(q || cat || model || stockF !== 'all')
  const clear = () => { setQ(''); setCat(''); setModel(''); setStock('all') }

  return (
    <div>
      <Header title="Tovarlar" right={<Button size="sm" icon="plus" onClick={() => setAdding(true)}>Tovar</Button>} />
      <div className="sticky top-14 z-20 bg-bg px-4 pb-2 pt-3">
        <label className="relative block">
          <Icon name="search" size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nomi, artikul yoki model…" enterKeyHint="search" autoComplete="off"
            className="h-12 w-full rounded border border-line bg-surface pl-11 pr-11 text-base outline-none focus:border-accent" aria-label="Tovar qidirish" />
          {q && <button aria-label="Tozalash" onClick={() => setQ('')} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-muted"><Icon name="x" size={18} /></button>}
        </label>
        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
          <FilterChip active={!!cat} icon="chevronDown" onClick={() => setPick('cat')}>{cat || 'Kategoriya'}</FilterChip>
          <FilterChip active={!!model} icon="chevronDown" onClick={() => setPick('model')}>{model || 'Model'}</FilterChip>
          <FilterChip active={stockF === 'low'} onClick={() => setStock(stockF === 'low' ? 'all' : 'low')}>Kam qoldi</FilterChip>
          <FilterChip active={stockF === 'out'} onClick={() => setStock(stockF === 'out' ? 'all' : 'out')}>Tugagan</FilterChip>
        </div>
      </div>

      {!all ? (
        <ul className="mt-2 px-4">{[...Array(6)].map((_, i) => <li key={i} className="mb-2 h-16 animate-pulse rounded-lg bg-surface-2" />)}</ul>
      ) : all.length === 0 ? (
        <Empty icon="box" title="Hali tovar yoʻq." text="Excel'dan yuklang yoki qoʻlda qoʻshing — ikkalasi ham bir xil tez."
          action={<><Button variant="secondary" icon="file" onClick={() => nav('/more/settings')}>Excel'dan yuklash</Button><Button icon="plus" onClick={() => setAdding(true)}>Qoʻlda qoʻshish</Button></>} />
      ) : list.length === 0 ? (
        <Empty icon="search" title={q ? `„${q}“ boʻyicha topilmadi.` : 'Filtr boʻyicha topilmadi.'}
          action={<>{hasFilter && <Button variant="secondary" onClick={clear}>Filtrlarni tozalash</Button>}<Button icon="plus" onClick={() => setAdding(true)}>Yangi tovar qoʻshish</Button></>} />
      ) : (
        <>
          <ul className="mt-1 border-t border-line">
            {list.map((p) => (
              <li key={p.id}>
                <Row onClick={() => nav(`/products/${p.id}`)}>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 font-medium leading-snug">{p.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted">
                      {p.sku && <span className="font-mono">{p.sku}</span>}
                      {p.models.length > 0 && <span className="truncate">{p.models.join(', ')}</span>}
                      <StockChip p={p} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className={`font-mono text-[15px] font-medium tnum ${p.stock <= 0 ? 'text-crit' : ''}`}>{p.stock} {p.unit}</span>
                    <span className="text-[13px] text-muted tnum">{money(p.price, false)}</span>
                  </div>
                  <Icon name="chevronRight" size={18} className="shrink-0 text-line-strong" />
                </Row>
              </li>
            ))}
          </ul>
          <p className="px-4 py-3 text-center text-[13px] text-muted">{list.length} ta tovar{hasFilter && all.length !== list.length ? ` · jami ${all.length}` : ''}</p>
        </>
      )}

      {/* Filtr tanlash sheet'lari */}
      <Sheet open={pick === 'cat'} onClose={() => setPick(null)} title="Kategoriya">
        <PickList value={cat} options={CATEGORIES} onPick={(v) => { setCat(v); setPick(null) }} />
      </Sheet>
      <Sheet open={pick === 'model'} onClose={() => setPick(null)} title="Mashina modeli">
        <PickList value={model} options={CAR_MODELS} onPick={(v) => { setModel(v); setPick(null) }} />
      </Sheet>

      <ProductForm open={adding} onClose={closeAdd} initialName={q} />
    </div>
  )
}

export function PickList({ value, options, onPick }: { value: string; options: readonly string[]; onPick: (v: string) => void }) {
  return (
    <ul className="-mx-2">
      <li><button onClick={() => onPick('')} className={`flex h-11 w-full items-center justify-between rounded px-3 text-left ${!value ? 'bg-accent-soft text-accent-text' : 'hover:bg-surface-2'}`}>Hammasi{!value && <Icon name="check" size={18} />}</button></li>
      {options.map((o) => (
        <li key={o}><button onClick={() => onPick(o)} className={`flex h-11 w-full items-center justify-between rounded px-3 text-left ${value === o ? 'bg-accent-soft text-accent-text' : 'hover:bg-surface-2'}`}>{o}{value === o && <Icon name="check" size={18} />}</button></li>
      ))}
    </ul>
  )
}
