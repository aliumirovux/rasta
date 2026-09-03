import { db, addProduct, addCustomer, createSale, setSetting, getSetting } from './db'
import { isoDay, startOfDay } from './format'

const DAY = 86400000

// Namunaviy do'kon — pilotgacha prototipni "to'la" ko'rsatish uchun. Haqiqiy do'konda o'chiriladi.
const PRODUCTS: Array<{ name: string; sku?: string; category: string; models: string[]; cost?: number; price: number; stock: number; min?: number; unit?: string; brand?: string }> = [
  { name: 'Tormoz kolodkasi old', sku: '96534653', category: 'Tormoz', models: ['Cobalt', 'Gentra'], cost: 70000, price: 85000, stock: 12, brand: 'GM' },
  { name: 'Tormoz kolodkasi orqa', sku: '96534663', category: 'Tormoz', models: ['Cobalt', 'Gentra'], cost: 65000, price: 80000, stock: 6 },
  { name: 'Moy filtri', sku: '25183779', category: 'Filtrlar', models: ['Cobalt', 'Gentra', 'Lacetti'], cost: 32000, price: 45000, stock: 2, min: 5 },
  { name: 'Havo filtri', sku: '13272717', category: 'Filtrlar', models: ['Cobalt'], cost: 38000, price: 55000, stock: 9 },
  { name: 'Salon filtri', sku: '13271190', category: 'Filtrlar', models: ['Cobalt', 'Gentra', 'Tracker'], cost: 28000, price: 40000, stock: 4 },
  { name: 'Salnik kolenval old', sku: '90182169', category: 'Dvigatel', models: ['Nexia 3', 'Gentra'], cost: 25000, price: 38000, stock: 0 },
  { name: 'Sham (svecha) toʻplami', sku: '96130723', category: 'Elektr', models: ['Nexia 3', 'Gentra', 'Cobalt'], cost: 95000, price: 130000, stock: 7, unit: 'toʻplam' },
  { name: 'Tormoz suyuqligi DOT4 1 l', category: 'Moy va suyuqliklar', models: ['Universal'], cost: 210000, price: 270000, stock: 0, unit: 'litr' },
  { name: 'Motor moyi 5W-30 4 l', sku: 'GM-5W30-4', category: 'Moy va suyuqliklar', models: ['Universal'], cost: 480000, price: 560000, stock: 5, unit: 'dona', brand: 'GM' },
  { name: 'Amortizator old', sku: '96586901', category: 'Osma', models: ['Cobalt'], cost: 310000, price: 380000, stock: 3, min: 2 },
  { name: 'Shar tayanch (sharovoy)', sku: '96535089', category: 'Osma', models: ['Nexia 3', 'Gentra', 'Lacetti'], cost: 120000, price: 150000, stock: 8 },
  { name: 'Rul nakonechnigi', sku: '96535226', category: 'Osma', models: ['Cobalt', 'Gentra'], cost: 60000, price: 78000, stock: 10 },
  { name: 'Generator remeni', sku: '96568316', category: 'Dvigatel', models: ['Damas', 'Labo'], cost: 35000, price: 48000, stock: 15 },
  { name: 'Tormoz diski old', sku: '96471275', category: 'Tormoz', models: ['Nexia 3', 'Gentra'], cost: 240000, price: 290000, stock: 4 },
  { name: 'Faralar lampasi H4', category: 'Elektr', models: ['Universal'], cost: 18000, price: 25000, stock: 24 },
  { name: 'Oyna tozalagich 22"', sku: 'WB-22', category: 'Aksessuar', models: ['Universal'], cost: 40000, price: 60000, stock: 11 },
  { name: 'Akkumulyator 60 Ah', category: 'Elektr', models: ['Universal'], cost: 620000, price: 720000, stock: 2, min: 2 },
  { name: 'Kuzov tutqichi tashqi', sku: '96548143', category: 'Kuzov', models: ['Damas'], cost: 22000, price: 35000, stock: 5 },
  { name: 'Radiator', sku: '95227750', category: 'Dvigatel', models: ['Cobalt'], cost: 700000, price: 820000, stock: 1, min: 1 },
  { name: 'Termostat', sku: '96984104', category: 'Dvigatel', models: ['Cobalt', 'Gentra', 'Tracker'], cost: 85000, price: 110000, stock: 6 },
]

type Line = [idx: number, qty: number, price: number, disc: number]
interface SaleSeed {
  minsAgo?: number                 // bugungi sotuv
  daysAgo?: number; hour?: number   // ilgarigi sotuv
  pay: 'cash' | 'card' | 'transfer' | 'credit'
  cust?: 'sherzod' | 'bobur'
  overdue?: boolean                 // nasiya: muddati o'tgan (kecha) ; aks holda +7 kun
  lines: Line[]
}

export async function seedIfEmpty(): Promise<boolean> {
  const done = await getSetting<boolean>('seeded', false)
  if (done) return false
  const count = await db.products.count()
  if (count > 0) { await setSetting('seeded', true); return false }

  const ids: string[] = []
  for (const p of PRODUCTS) {
    ids.push(await addProduct({ name: p.name, sku: p.sku, brand: p.brand, category: p.category, models: p.models, unit: p.unit ?? 'dona', costPrice: p.cost, price: p.price, minStock: p.min ?? 2, initialStock: p.stock }))
  }
  const sherzod = await addCustomer({ name: 'Sherzod usta', phone: '998901234567', kind: 'usta' })
  const bobur = await addCustomer({ name: 'Bobur (Chilonzor)', phone: '998931112233', kind: 'usta' })
  await addCustomer({ name: 'Avto-servis «Lider»', phone: '998977654321', kind: 'dokon' })
  const custId: Record<'sherzod' | 'bobur', string> = { sherzod: sherzod.id, bobur: bobur.id }

  // So'nggi 7 kunlik sotuvlar — trend va "kecha bilan solishtirish" ma'noli bo'lishi uchun
  const SALES: SaleSeed[] = [
    // Bugun — jami 1 116 000 (naqd 215 000 · nasiya 615 000)
    { minsAgo: 8, pay: 'transfer', lines: [[11, 2, 78000, 0]] },
    { minsAgo: 22, pay: 'card', lines: [[6, 1, 130000, 0]] },
    { minsAgo: 45, pay: 'cash', lines: [[0, 2, 85000, 0], [2, 1, 45000, 0]] },
    { minsAgo: 63, pay: 'credit', cust: 'bobur', lines: [[8, 1, 560000, 0], [3, 1, 55000, 0]] },
    // Kecha — ~933 000
    { daysAgo: 1, hour: 9, pay: 'cash', lines: [[9, 1, 380000, 0], [6, 1, 130000, 0]] },
    { daysAgo: 1, hour: 12, pay: 'card', lines: [[13, 1, 290000, 0]] },
    { daysAgo: 1, hour: 15, pay: 'transfer', lines: [[11, 1, 78000, 0], [3, 1, 55000, 0]] },
    // 2 kun oldin — ~501 000
    { daysAgo: 2, hour: 10, pay: 'cash', lines: [[0, 1, 85000, 0], [4, 1, 40000, 0]] },
    { daysAgo: 2, hour: 13, pay: 'card', lines: [[10, 1, 150000, 0]] },
    { daysAgo: 2, hour: 16, pay: 'transfer', lines: [[12, 2, 48000, 0]] },
    { daysAgo: 2, hour: 18, pay: 'cash', lines: [[6, 1, 130000, 0]] },
    // 3 kun oldin — ~700 000
    { daysAgo: 3, hour: 11, pay: 'card', lines: [[13, 1, 290000, 0]] },
    { daysAgo: 3, hour: 14, pay: 'cash', lines: [[10, 2, 150000, 0]] },
    { daysAgo: 3, hour: 17, pay: 'transfer', lines: [[14, 2, 25000, 0], [15, 1, 60000, 0]] },
    // 4 kun oldin — ~1 025 000 (eng yuqori kun)
    { daysAgo: 4, hour: 10, pay: 'cash', lines: [[16, 1, 720000, 0], [14, 1, 25000, 0]] },
    { daysAgo: 4, hour: 13, pay: 'card', lines: [[0, 2, 85000, 0]] },
    { daysAgo: 4, hour: 16, pay: 'transfer', lines: [[19, 1, 110000, 0]] },
    // 5 kun oldin — ~768 000
    { daysAgo: 5, hour: 11, pay: 'card', lines: [[8, 1, 560000, 0]] },
    { daysAgo: 5, hour: 14, pay: 'cash', lines: [[11, 1, 78000, 0]] },
    { daysAgo: 5, hour: 17, pay: 'transfer', lines: [[6, 1, 130000, 0]] },
    // 6 kun oldin — Sherzod nasiya, muddati o'tgan (740 000)
    { daysAgo: 6, hour: 12, pay: 'credit', cust: 'sherzod', overdue: true, lines: [[9, 2, 380000, 20000]] },
  ]

  const now = Date.now()
  for (const s of SALES) {
    const lines = s.lines.map(([idx, qty, price, discount]) => ({ productId: ids[idx], qty, price, discount }))
    const dueDate = s.pay === 'credit' ? isoDay(new Date(s.overdue ? now - DAY : now + 7 * DAY)) : undefined
    const sale = await createSale({ lines, paymentType: s.pay, customerId: s.cust ? custId[s.cust] : undefined, dueDate })
    const ts = s.minsAgo != null
      ? now - s.minsAgo * 60000
      : startOfDay(new Date(now - (s.daysAgo ?? 0) * DAY)) + (s.hour ?? 12) * 3600000
    await db.sales.update(sale.id, { createdAt: ts })
    if (s.pay === 'credit') {
      const c = await db.credits.where('saleId').equals(sale.id).first()
      if (c) await db.credits.update(c.id, { createdAt: ts })
    }
  }

  await setSetting('store', { name: 'Sherzod avto', market: 'Sergeli avtobozori, 14-rasta', phone: '998901234567' })
  await setSetting('seeded', true)
  return true
}
