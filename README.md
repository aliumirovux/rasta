# Rasta

Avto-qismlar va aksessuar doʻkonlari uchun sotuv, qoldiq va nasiya hisobi. Telefon-first PWA, oflayn ishlaydi.

**Holat:** MVP-1, lokal rejim (barcha maʼlumot brauzerda — IndexedDB). Supabase sinxronizatsiyasi va SMS-kirish — keyingi bosqich.

**Jonli:** https://aliumirovux.github.io/rasta/ — `main` ga har push'da GitHub Actions build qilib Pages'ga chiqaradi (`.github/workflows/deploy.yml`, `BASE_PATH=/rasta/`).

## Ishga tushirish

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # PWA build → dist/
npm run build:single # bitta HTML fayl (preview) → dist-single/index.html
npm run typecheck
```

## Tuzilma

```
src/
  styles/tokens.css   — dizayn tokenlari (rang, light/dark). Figma o'rniga haqiqat manbai
  styles/base.css     — Tailwind + bazaviy qoidalar
  lib/db.ts           — Dexie sxema + amallar (sotuv, nasiya, to'lov, qaytarish)
  lib/format.ts       — 1 250 000 soʻm · 10.09.2026 · +998 90 123-45-67
  lib/receipt.ts      — chek matni, ulashish (Web Share)
  lib/seed.ts         — namunaviy do'kon (birinchi ochilishda)
  components/         — Icon, ui (Button, Chip, Field, Sheet, Modal, KPI…), Shell (tab bar / sidebar), Toast
  screens/            — Today, Products, ProductCard, ProductForm, Sell (+To'lov), SaleResult,
                        Credit, CustomerCard (+To'lov qabul), SalesHistory, SaleDetail, More, Settings
```

## Asosiy qarorlar

- **Qoldiq = harakatlar yigʻindisi.** `movements` — ledger (kirim / sotuv / qaytarish / tuzatish), `products.stock` — kesh. Oflaynda ikki qurilmadan sotilganda konflikt yoʻq; `recomputeStock()` bilan qayta hisoblanadi.
- **Har yozuv UUID bilan** — sync idempotent boʻladi.
- **Hisobda 0 boʻlsa ham sotishga ruxsat** (ogohlantirish bilan) — bozor haqiqati.
- **Nasiya toʻlovi FIFO** — eng eski ochiq qarzdan boshlab yopiladi.
- **Sotuv oʻchirilmaydi, faqat qaytariladi** (audit).
- **UI matni faqat oʻzbek (lotin)**, apostrof — `ʻ` (U+02BB). Lugʻat: PRD 10-boʻlim.

## Push (brauzer orqali, tokensiz)

GitHub web-upload papka yoʻlini saqlamaydi — har papka oʻz manziliga yuklanadi, keyin Actions oʻzi build qiladi:

| Papka | Upload manzili |
|---|---|
| root (index.html, package.json, vite.config.ts …) | `https://github.com/aliumirovux/rasta/upload/main` |
| `src/` | `…/upload/main/src` |
| `src/lib/` | `…/upload/main/src/lib` |
| `src/components/` | `…/upload/main/src/components` |
| `src/screens/` | `…/upload/main/src/screens` |
| `src/styles/` | `…/upload/main/src/styles` |
| `public/` | `…/upload/main/public` |
| `.github/workflows/` | `…/upload/main/.github/workflows` |

Yangi paket qoʻshilsa `package.json` **va** `package-lock.json` birga yuklanadi (Actions `npm ci` ishlatadi).

## Keyingi bosqichlar

1. Supabase: `products / movements / sales / customers / credits / payments` jadvallari, RLS `store_id` boʻyicha, push/pull sync navbati (`synced = 0`).
2. Kirish: telefon + SMS (Eskiz) → Supabase custom OTP.
3. Excel import (SheetJS, brauzerda), hisobot, kirim, rollar — PRD MVP-2.
4. Onlayn-kassa — PRD MVP-3 (`ikpu` maydoni allaqachon bazada).

PRD: Rasta MVP v0.1 (artifact).
