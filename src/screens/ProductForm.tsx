import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addProduct, db, normSku, updateProduct, type Product } from '@/lib/db'
import { CATEGORIES, CAR_MODELS, UNITS } from '@/lib/catalog'
import { Button, Field, Modal, MoneyField, Select } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { Icon } from '@/components/Icon'

interface Props { open: boolean; onClose: () => void; initialName?: string; edit?: Product; onSaved?: (id: string) => void }

// PRD S2.2: yorliq ustida, blur'da tekshiruv, dublikat ogohlantirish (bloklamaydi), "Yana qo'shish"
export function ProductForm({ open, onClose, initialName = '', edit, onSaved }: Props) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [cost, setCost] = useState(0)
  const [initStock, setInitStock] = useState('')
  const [minStock, setMinStock] = useState('2')
  const [unit, setUnit] = useState('dona')
  const [brand, setBrand] = useState('')
  const [barcode, setBarcode] = useState('')
  const [note, setNote] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Oxirgi tanlangan kategoriya/modellar — keyingi tovar uchun oldindan
  const last = useLiveQuery(() => db.settings.get('lastProductDefaults'), [])

  useEffect(() => {
    if (!open) return
    if (edit) {
      setName(edit.name); setPrice(edit.price); setSku(edit.sku ?? ''); setCategory(edit.category ?? ''); setModels(edit.models)
      setCost(edit.costPrice ?? 0); setMinStock(String(edit.minStock)); setUnit(edit.unit); setBrand(edit.brand ?? ''); setBarcode(edit.barcode ?? ''); setNote(edit.note ?? '')
    } else {
      const d = (last?.value as { category?: string; models?: string[] } | undefined) ?? {}
      setName(initialName); setPrice(0); setSku(''); setCategory(d.category ?? ''); setModels(d.models ?? [])
      setCost(0); setInitStock(''); setMinStock('2'); setUnit('dona'); setBrand(''); setBarcode(''); setNote('')
    }
    setTouched({}); setDirty(false); setMoreOpen(false)
  }, [open, edit, initialName, last])

  const dup = useLiveQuery(async () => {
    const n = normSku(sku)
    if (!n || n.length < 3) return undefined
    const p = await db.products.where('skuNorm').equals(n).first()
    return p && p.id !== edit?.id ? p : undefined
  }, [sku, edit?.id])

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (name.trim().length < 2) e.name = 'Tovar nomini kiriting (kamida 2 belgi).'
    if (!price) e.price = 'Sotish narxini kiriting.'
    return e
  }, [name, price])

  const mark = (k: string) => setTouched((t) => ({ ...t, [k]: true }))
  const change = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true) }

  const close = () => {
    if (dirty && !window.confirm('Oʻzgarishlar saqlanmadi. Saqlamay chiqasizmi?')) return
    onClose()
  }

  const save = async (again: boolean) => {
    setTouched({ name: true, price: true })
    if (Object.keys(errors).length) return
    setSaving(true)
    try {
      const payload = {
        name: name.trim(), price, sku: sku.trim() || undefined, category: category || undefined, models,
        costPrice: cost || undefined, minStock: parseInt(minStock || '0', 10) || 0, unit, brand: brand.trim() || undefined,
        barcode: barcode.trim() || undefined, note: note.trim() || undefined,
      }
      let id: string
      if (edit) { await updateProduct(edit.id, payload); id = edit.id; toast({ text: 'Saqlandi' }) }
      else {
        id = await addProduct({ ...payload, initialStock: parseInt(initStock || '0', 10) || 0 })
        await db.settings.put({ key: 'lastProductDefaults', value: { category, models } })
        toast({ text: 'Tovar qoʻshildi' })
      }
      onSaved?.(id)
      if (again) { setName(''); setPrice(0); setSku(''); setCost(0); setInitStock(''); setBrand(''); setBarcode(''); setNote(''); setTouched({}); setDirty(false) }
      else onClose()
    } finally { setSaving(false) }
  }

  const toggleModel = (m: string) => change(setModels)(models.includes(m) ? models.filter((x) => x !== m) : [...models, m])

  return (
    <Modal open={open} onClose={close} title={edit ? 'Tovarni tahrirlash' : 'Yangi tovar'}
      footer={
        <div className="flex gap-2">
          {!edit && <Button variant="secondary" size="lg" onClick={() => save(true)} disabled={saving}>Yana qoʻshish</Button>}
          <Button size="lg" full onClick={() => save(false)} disabled={saving}>{saving ? 'Saqlanmoqda…' : 'Saqlash'}</Button>
        </div>
      }>
      <div className="flex flex-col gap-4">
        <Field label="Nomi *" value={name} onChange={change(setName)} onBlur={() => mark('name')} error={touched.name ? errors.name : undefined} placeholder="Masalan: Tormoz kolodkasi old" autoFocus={!edit} />
        <MoneyField label="Sotish narxi *" value={price} onChange={change(setPrice)} onBlur={() => mark('price')} error={touched.price ? errors.price : undefined} placeholder="0" />
        <Field label="Artikul / OEM" value={sku} onChange={change(setSku)} mono placeholder="96534653" autoCapitalize="characters"
          hint={dup ? undefined : 'Qidiruvda va chekda chiqadi'} />
        {dup && (
          <div className="-mt-2 flex items-start gap-2 rounded border border-warn bg-warn-soft px-3 py-2 text-sm text-warn">
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
            <span>Bu artikul bilan tovar bor: <b>{dup.name}</b>. Baribir saqlash mumkin.</span>
          </div>
        )}
        <Select label="Kategoriya" value={category} onChange={change(setCategory)} options={CATEGORIES} placeholder="Tanlang" />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Mos modellar</span>
          <div className="flex flex-wrap gap-2">
            {CAR_MODELS.map((m) => (
              <button type="button" key={m} onClick={() => toggleModel(m)} aria-pressed={models.includes(m)}
                className={`press h-9 rounded-full border px-3 text-sm ${models.includes(m) ? 'border-accent bg-accent-soft font-medium text-accent-text' : 'border-line bg-surface'}`}>{m}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label="Kelish narxi" value={cost} onChange={change(setCost)} placeholder="0" />
          {!edit
            ? <Field label="Boshlangʻich qoldiq" value={initStock} onChange={change(setInitStock)} inputMode="numeric" placeholder="0" suffix={unit} mono />
            : <Field label="Min qoldiq" value={minStock} onChange={change(setMinStock)} inputMode="numeric" mono suffix={unit} />}
        </div>
        <button type="button" onClick={() => setMoreOpen((v) => !v)} className="flex h-11 items-center gap-1 self-start text-[15px] font-medium text-accent-text">
          Qoʻshimcha <Icon name="chevronDown" size={18} className={moreOpen ? 'rotate-180' : ''} />
        </button>
        {moreOpen && (
          <div className="flex flex-col gap-4">
            {!edit && <Field label="Min qoldiq" value={minStock} onChange={change(setMinStock)} inputMode="numeric" mono hint="Shu miqdorga tushganda «Kam qoldi» chiqadi" />}
            <Select label="Oʻlchov birligi" value={unit} onChange={change(setUnit)} options={UNITS} />
            <Field label="Brend" value={brand} onChange={change(setBrand)} placeholder="GM, Bosch…" />
            <Field label="Shtrix-kod" value={barcode} onChange={change(setBarcode)} inputMode="numeric" mono />
            <Field label="Izoh" value={note} onChange={change(setNote)} />
          </div>
        )}
      </div>
    </Modal>
  )
}
