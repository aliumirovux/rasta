import { db, addProduct, addCustomer, createSale, setSetting, getSetting } from './db'

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

  // Bir nechta sotuv — bugun va ilgari
  const yesterday = Date.now() - 86400000
  const sales = [
    { lines: [{ productId: ids[0], qty: 2, price: 85000, discount: 0 }, { productId: ids[2], qty: 1, price: 45000, discount: 0 }], paymentType: 'cash' as const },
    { lines: [{ productId: ids[6], qty: 1, price: 130000, discount: 0 }], paymentType: 'card' as const },
    { lines: [{ productId: ids[9], qty: 2, price: 380000, discount: 20000 }], paymentType: 'credit' as const, customerId: sherzod.id, dueDays: -3 },
    { lines: [{ productId: ids[8], qty: 1, price: 560000, discount: 0 }, { productId: ids[3], qty: 1, price: 55000, discount: 0 }], paymentType: 'credit' as const, customerId: bobur.id, dueDays: 7 },
    { lines: [{ productId: ids[11], qty: 2, price: 78000, discount: 0 }], paymentType: 'transfer' as const },
  ]
  for (const s of sales) {
    const sale = await createSale(s)
    // sanani "kecha"ga surish — tarix ko'rinishi uchun
    if (s.paymentType === 'credit' && s.customerId === sherzod.id) {
      await db.sales.update(sale.id, { createdAt: yesterday - 86400000 * 5 })
      const c = await db.credits.where('saleId').equals(sale.id).first()
      if (c) await db.credits.update(c.id, { createdAt: yesterday - 86400000 * 5 })
    }
  }
  await setSetting('store', { name: 'Sherzod avto', market: 'Sergeli avtobozori, 14-rasta', phone: '998901234567' })
  await setSetting('seeded', true)
  return true
}
