// Spravochniklar — PRD 05-bo'lim. Do'konchi o'zi qo'shishi mumkin (MVP-2), hozircha statik.
export const CAR_MODELS = [
  'Damas', 'Labo', 'Matiz', 'Spark', 'Nexia 2', 'Nexia 3', 'Cobalt', 'Gentra', 'Lacetti',
  'Onix', 'Malibu', 'Malibu 2', 'Tracker', 'Captiva', 'Equinox', 'Tahoe',
  'Kia Sonet', 'Kia Seltos', 'Kia K5', 'Chery Tiggo 4', 'Chery Tiggo 7', 'Haval Jolion',
  'BYD Chazor', 'BYD Song Plus', 'Universal',
] as const

export const CATEGORIES = [
  'Filtrlar', 'Tormoz', 'Osma', 'Dvigatel', 'Elektr', 'Kuzov', 'Moy va suyuqliklar', 'Aksessuar', 'Boshqa',
] as const

export const UNITS = ['dona', 'litr', 'toʻplam', 'metr'] as const

export type Unit = (typeof UNITS)[number]
