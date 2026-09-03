import { db, type Sale } from './db'
import { dateShort, money, phone, time } from './format'

const PAY_LABEL: Record<Sale['paymentType'], string> = { cash: 'Naqd', card: 'Karta', transfer: 'Oʻtkazma', credit: 'Nasiya' }
export const payLabel = (t: Sale['paymentType']) => PAY_LABEL[t]

/** Chek matni — Telegram/SMS orqali ulashish uchun (PRD S3.2) */
export async function receiptText(sale: Sale): Promise<string> {
  const store = ((await db.settings.get('store'))?.value as { name?: string; market?: string; phone?: string } | undefined) ?? {}
  const lines: string[] = []
  lines.push(`${store.name ?? 'Doʻkon'}${store.market ? ' · ' + store.market : ''}`)
  lines.push(`Chek № ${sale.number} · ${dateShort(sale.createdAt)} ${time(sale.createdAt)}`)
  for (const l of sale.lines) {
    const disc = l.discount ? ` − ${money(l.discount, false)}` : ''
    lines.push(`${l.name}${l.sku ? ` (${l.sku})` : ''}  ${l.qty} × ${money(l.price, false)}${disc} = ${money(Math.max(0, l.qty * l.price - l.discount), false)}`)
  }
  let pay = PAY_LABEL[sale.paymentType]
  if (sale.paymentType === 'credit') {
    const c = await db.credits.where('saleId').equals(sale.id).first()
    if (c) pay += `, muddat ${dateShort(c.dueDate + 'T00:00:00')}`
  }
  lines.push(`Jami: ${money(sale.total)} · ${pay}`)
  if (sale.paymentType === 'credit' && sale.customerId) {
    const cs = await db.credits.where('customerId').equals(sale.customerId).toArray()
    const debt = cs.reduce((s, c) => s + c.amount - c.paid, 0)
    lines.push(`Umumiy qarzingiz: ${money(debt)}`)
  }
  if (store.phone) lines.push(`Tel: ${phone(store.phone)}`)
  return lines.join('\n')
}

export async function shareText(text: string, title = 'Chek'): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) { await navigator.share({ title, text }); return 'shared' }
  } catch { /* bekor qilindi */ }
  try { await navigator.clipboard.writeText(text); return 'copied' } catch { return 'failed' }
}
