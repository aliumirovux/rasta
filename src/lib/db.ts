import Dexie, { type Table } from 'dexie'
import { uid } from './id'
import { isoDay } from './format'

// ---------- Turlar (PRD 05) ----------
export type PaymentType = 'cash' | 'card' | 'transfer' | 'credit'
export type MovementType = 'in' | 'sale' | 'return' | 'adjust'
export type SaleStatus = 'done' | 'partial_return' | 'returned'
export type CreditStatus = 'open' | 'partial' | 'paid'

export interface Product {
  id: string
  name: string
  sku?: string            // artikul / OEM
  skuNorm?: string        // qidiruv uchun normalizatsiya
  brand?: string
  category?: string
  models: string[]        // mos modellar
  unit: string
  costPrice?: number      // kelish narxi
  price: number           // sotish narxi
  minStock: number
  stock: number           // kesh; haqiqat — movements yig'indisi
  barcode?: string
  ikpu?: string           // MVP-3 uchun rezerv
  note?: string
  status: 'active' | 'archived'
  createdAt: number
  updatedAt: number
}

export interface Movement {
  id: string
  productId: string
  type: MovementType
  qty: number             // ±
  reason?: string
  saleId?: string
  createdAt: number
}

export interface SaleLine {
  productId: string
  name: string
  sku?: string
  qty: number
  price: number           // sotilgan narx (o'zgartirilgan bo'lishi mumkin)
  discount: number        // so'mda, qator uchun
  costPrice?: number
}

export interface Sale {
  id: string
  number: number
  createdAt: number
  lines: SaleLine[]
  total: number
  paymentType: PaymentType
  customerId?: string
  received?: number       // naqdda olingan summa
  status: SaleStatus
  note?: string
  synced: 0 | 1
}

export interface Customer {
  id: string
  name: string
  phone?: string
  kind: 'usta' | 'oddiy' | 'dokon'
  note?: string
  status: 'active' | 'archived'
  createdAt: number
  updatedAt: number
}

export interface Credit {
  id: string
  saleId: string
  customerId: string
  amount: number
  paid: number
  dueDate: string         // YYYY-MM-DD
  status: CreditStatus
  createdAt: number
}

export interface Payment {
  id: string
  customerId: string
  amount: number
  method: Exclude<PaymentType, 'credit'>
  createdAt: number
  allocations: { creditId: string; amount: number }[]
  note?: string
}

export interface CartLine {
  productId: string
  qty: number
  price: number
  discount: number
}
export interface Cart {
  id: 'current'
  lines: CartLine[]
  updatedAt: number
}

export interface Setting {
  key: string
  value: unknown
}

// ---------- Baza ----------
class RastaDB extends Dexie {
  products!: Table<Product, string>
  movements!: Table<Movement, string>
  sales!: Table<Sale, string>
  customers!: Table<Customer, string>
  credits!: Table<Credit, string>
  payments!: Table<Payment, string>
  cart!: Table<Cart, string>
  settings!: Table<Setting, string>

  constructor() {
    super('rasta')
    this.version(1).stores({
      products: 'id, name, skuNorm, category, *models, status, updatedAt',
      movements: 'id, productId, type, saleId, createdAt',
      sales: 'id, number, createdAt, paymentType, customerId, status, synced',
      customers: 'id, name, phone, status, updatedAt',
      credits: 'id, saleId, customerId, dueDate, status, createdAt',
      payments: 'id, customerId, createdAt',
      cart: 'id',
      settings: 'key',
    })
  }
}

export const db = new RastaDB()

// ---------- Yordamchilar ----------
export function normSku(s?: string): string | undefined {
  if (!s) return undefined
  return s.toLowerCase().replace(/[\s\-_.\/]/g, '')
}

const CYR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh',
  ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'oʻ', қ: 'q', ғ: 'gʻ', ҳ: 'h',
}
/** Qidiruv normalizatsiyasi: kirill → lotin, apostroflar olib tashlanadi, kichik harf */
export function normText(s: string): string {
  return s
    .toLowerCase()
    .split('')
    .map((c) => CYR[c] ?? c)
    .join('')
    .replace(/[ʻʼ'`’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export type StockState = 'ok' | 'low' | 'out' | 'negative'
export function stockState(p: Pick<Product, 'stock' | 'minStock'>): StockState {
  if (p.stock < 0) return 'negative'
  if (p.stock === 0) return 'out'
  if (p.stock <= p.minStock) return 'low'
  return 'ok'
}

export function lineTotal(l: { qty: number; price: number; discount: number }): number {
  return Math.max(0, l.qty * l.price - l.discount)
}
export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + lineTotal(l), 0)
}

// ---------- Amallar ----------
export async function addProduct(input: Omit<Product, 'id' | 'skuNorm' | 'stock' | 'createdAt' | 'updatedAt' | 'status'> & { initialStock?: number }): Promise<string> {
  const now = Date.now()
  const id = uid()
  const { initialStock = 0, ...rest } = input
  await db.transaction('rw', db.products, db.movements, async () => {
    await db.products.add({ ...rest, id, skuNorm: normSku(rest.sku), stock: initialStock, status: 'active', createdAt: now, updatedAt: now })
    if (initialStock !== 0) {
      await db.movements.add({ id: uid(), productId: id, type: 'adjust', qty: initialStock, reason: 'Boshlangʻich qoldiq', createdAt: now })
    }
  })
  return id
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<void> {
  await db.products.update(id, { ...patch, skuNorm: patch.sku !== undefined ? normSku(patch.sku) : undefined, updatedAt: Date.now() })
}

/** Qoldiq harakati: ledger + kesh bitta tranzaksiyada */
export async function applyMovement(m: Omit<Movement, 'id' | 'createdAt'> & { createdAt?: number }): Promise<void> {
  await db.transaction('rw', db.products, db.movements, async () => {
    await db.movements.add({ ...m, id: uid(), createdAt: m.createdAt ?? Date.now() })
    const p = await db.products.get(m.productId)
    if (p) await db.products.update(m.productId, { stock: p.stock + m.qty, updatedAt: Date.now() })
  })
}

/** Ledgerdan qayta hisoblash (sync/konflikt uchun) */
export async function recomputeStock(productId: string): Promise<number> {
  const ms = await db.movements.where('productId').equals(productId).toArray()
  const stock = ms.reduce((s, m) => s + m.qty, 0)
  await db.products.update(productId, { stock })
  return stock
}

async function nextSaleNumber(): Promise<number> {
  const last = await db.sales.orderBy('number').last()
  return (last?.number ?? 0) + 1
}

export interface CreateSaleInput {
  lines: CartLine[]
  paymentType: PaymentType
  customerId?: string
  received?: number
  dueDays?: number
  dueDate?: string
  note?: string
}

export async function createSale(input: CreateSaleInput): Promise<Sale> {
  const now = Date.now()
  const id = uid()
  return db.transaction('rw', db.products, db.movements, db.sales, db.credits, db.cart, async () => {
    const products = await db.products.bulkGet(input.lines.map((l) => l.productId))
    const lines: SaleLine[] = input.lines.map((l, i) => {
      const p = products[i]
      return { productId: l.productId, name: p?.name ?? '—', sku: p?.sku, qty: l.qty, price: l.price, discount: l.discount, costPrice: p?.costPrice }
    })
    const total = cartTotal(input.lines)
    const sale: Sale = {
      id, number: await nextSaleNumber(), createdAt: now, lines, total,
      paymentType: input.paymentType, customerId: input.customerId, received: input.received,
      status: 'done', note: input.note, synced: 0,
    }
    await db.sales.add(sale)
    for (const l of lines) {
      await db.movements.add({ id: uid(), productId: l.productId, type: 'sale', qty: -l.qty, saleId: id, createdAt: now })
      const p = products.find((x) => x?.id === l.productId)
      if (p) await db.products.update(p.id, { stock: p.stock - l.qty, updatedAt: now })
    }
    if (input.paymentType === 'credit') {
      if (!input.customerId) throw new Error('Nasiya uchun mijoz kerak')
      const due = input.dueDate ?? isoDay(new Date(now + (input.dueDays ?? 7) * 86400000))
      await db.credits.add({ id: uid(), saleId: id, customerId: input.customerId, amount: total, paid: 0, dueDate: due, status: 'open', createdAt: now })
    }
    await db.cart.put({ id: 'current', lines: [], updatedAt: now })
    return sale
  })
}

/** Qarz to'lovi — FIFO: eng eski ochiq qarzdan boshlab */
export async function receivePayment(input: { customerId: string; amount: number; method: Payment['method']; createdAt?: number; note?: string }): Promise<Payment> {
  const now = input.createdAt ?? Date.now()
  return db.transaction('rw', db.credits, db.payments, async () => {
    const open = (await db.credits.where('customerId').equals(input.customerId).toArray())
      .filter((c) => c.status !== 'paid')
      .sort((a, b) => a.createdAt - b.createdAt)
    let left = input.amount
    const allocations: Payment['allocations'] = []
    for (const c of open) {
      if (left <= 0) break
      const need = c.amount - c.paid
      const take = Math.min(need, left)
      const paid = c.paid + take
      await db.credits.update(c.id, { paid, status: paid >= c.amount ? 'paid' : 'partial' })
      allocations.push({ creditId: c.id, amount: take })
      left -= take
    }
    if (left > 0) throw new Error('Summa qarzdan koʻp')
    const p: Payment = { id: uid(), customerId: input.customerId, amount: input.amount, method: input.method, createdAt: now, allocations, note: input.note }
    await db.payments.add(p)
    return p
  })
}

/** Qaytarish (S5.3): qoldiq qaytadi, sotuv statusi yangilanadi, nasiya bo'lsa qarz kamayadi */
export async function returnSale(saleId: string, items: { productId: string; qty: number }[], reason: string): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.sales, db.movements, db.products, db.credits, async () => {
    const sale = await db.sales.get(saleId)
    if (!sale) throw new Error('Sotuv topilmadi')
    let returnedSum = 0
    const lines = sale.lines.map((l) => ({ ...l }))
    for (const it of items) {
      if (it.qty <= 0) continue
      const line = lines.find((l) => l.productId === it.productId)
      if (!line) continue
      const qty = Math.min(it.qty, line.qty)
      const unitDiscount = line.qty ? line.discount / line.qty : 0
      returnedSum += qty * line.price - qty * unitDiscount
      line.qty -= qty
      line.discount = Math.max(0, line.discount - qty * unitDiscount)
      await db.movements.add({ id: uid(), productId: it.productId, type: 'return', qty, reason, saleId, createdAt: now })
      const p = await db.products.get(it.productId)
      if (p) await db.products.update(p.id, { stock: p.stock + qty, updatedAt: now })
    }
    const remaining = lines.filter((l) => l.qty > 0)
    const newTotal = remaining.reduce((s, l) => s + Math.max(0, l.qty * l.price - l.discount), 0)
    await db.sales.update(saleId, { lines, total: newTotal, status: remaining.length === 0 ? 'returned' : 'partial_return', synced: 0 })
    if (sale.paymentType === 'credit') {
      const c = await db.credits.where('saleId').equals(saleId).first()
      if (c) {
        const amount = Math.max(0, c.amount - Math.round(returnedSum))
        const paid = Math.min(c.paid, amount)
        await db.credits.update(c.id, { amount, paid, status: paid >= amount ? 'paid' : paid > 0 ? 'partial' : 'open' })
      }
    }
  })
}

export async function customerDebt(customerId: string): Promise<number> {
  const cs = await db.credits.where('customerId').equals(customerId).toArray()
  return cs.reduce((s, c) => s + (c.amount - c.paid), 0)
}

export async function addCustomer(input: { name: string; phone?: string; kind?: Customer['kind']; note?: string }): Promise<Customer> {
  const now = Date.now()
  const c: Customer = { id: uid(), name: input.name.trim(), phone: input.phone, kind: input.kind ?? 'usta', note: input.note, status: 'active', createdAt: now, updatedAt: now }
  await db.customers.add(c)
  return c
}

export async function getCart(): Promise<Cart> {
  return (await db.cart.get('current')) ?? { id: 'current', lines: [], updatedAt: 0 }
}
export async function setCart(lines: CartLine[]): Promise<void> {
  await db.cart.put({ id: 'current', lines, updatedAt: Date.now() })
}
export async function addToCart(productId: string, price: number): Promise<void> {
  const cart = await getCart()
  const i = cart.lines.findIndex((l) => l.productId === productId)
  if (i >= 0) cart.lines[i].qty += 1
  else cart.lines.unshift({ productId, qty: 1, price, discount: 0 })
  await setCart(cart.lines)
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await db.settings.get(key)
  return (s?.value as T) ?? fallback
}
export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}
