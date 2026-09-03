// Formatlar — PRD 10-bo'lim: 1 250 000 soʻm · 10.09.2026 · 17:42 · +998 90 123-45-67
const NBSP = ' '

export function money(n: number, withUnit = true): string {
  const sign = n < 0 ? '−' : ''
  const abs = Math.round(Math.abs(n))
  const s = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return withUnit ? `${sign}${s}${NBSP}soʻm` : `${sign}${s}`
}

/** Raqam kiritish maydoni uchun: "85000" → "85 000" */
export function groupDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
export function parseDigits(raw: string): number {
  const d = raw.replace(/\D/g, '')
  return d ? parseInt(d, 10) : 0
}

const pad = (n: number) => n.toString().padStart(2, '0')

export function dateShort(d: Date | string | number): string {
  const x = new Date(d)
  return `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()}`
}
export function dateDM(d: Date | string | number): string {
  const x = new Date(d)
  return `${pad(x.getDate())}.${pad(x.getMonth() + 1)}`
}
export function time(d: Date | string | number): string {
  const x = new Date(d)
  return `${pad(x.getHours())}:${pad(x.getMinutes())}`
}
export function isoDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const UZ_WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba']
/** 3-sentabr, payshanba */
export function uzDateLong(d: Date = new Date()): string {
  return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${UZ_WEEKDAYS[d.getDay()]}`
}
export function startOfDay(d: Date = new Date()): number {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
/** Bugun / Kecha / 10.09.2026 */
export function dayLabel(ts: number): string {
  const today = startOfDay()
  const day = startOfDay(new Date(ts))
  if (day === today) return 'Bugun'
  if (day === today - 86400000) return 'Kecha'
  return dateShort(ts)
}
/** Muddatgacha necha kun: manfiy — o'tib ketgan */
export function daysUntil(dueIso: string): number {
  const due = new Date(dueIso + 'T00:00:00').getTime()
  return Math.round((due - startOfDay()) / 86400000)
}

export function phone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  const m = d.match(/^998(\d{2})(\d{3})(\d{2})(\d{2})$/)
  if (!m) return raw
  return `+998 ${m[1]} ${m[2]}-${m[3]}-${m[4]}`
}
/** Kiritish maskasi: +998 __ ___-__-__ */
export function phoneMask(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('998')) d = d.slice(3)
  d = d.slice(0, 9)
  let out = '+998'
  if (d.length > 0) out += ' ' + d.slice(0, 2)
  if (d.length > 2) out += ' ' + d.slice(2, 5)
  if (d.length > 5) out += '-' + d.slice(5, 7)
  if (d.length > 7) out += '-' + d.slice(7, 9)
  return out
}
export function phoneDigits(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (!d.startsWith('998')) d = '998' + d
  return d
}

export function plural(n: number, word: string): string {
  return `${n} ${word}`
}
