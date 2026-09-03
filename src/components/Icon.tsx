// Bitta ikonka oilasi (24×24, stroke 1.75) — emoji yo'q, uch xil to'plam yo'q.
const paths: Record<string, string> = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.35-4.35',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  x: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5 9.5 17 19 7.5',
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft: 'm15 6-6 6 6 6',
  chevronDown: 'm6 9 6 6 6-6',
  alert: 'M12 9v4m0 4h.01M10.3 3.9 2.5 17.3A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.7L13.7 3.9a2 2 0 0 0-3.4 0Z',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  share: 'M12 3v12m0-12L8 7m4-4 4 4M5 13v6h14v-6',
  home: 'M3 11 12 4l9 7v9h-6v-6H9v6H3v-9Z',
  box: 'M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8',
  cart: 'M3 4h2l2.4 11h11.2L21 7H7M9 20h.01M17 20h.01',
  credit: 'M3 7h18v10H3V7Zm0 3h18M7 14h4',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  cash: 'M2 7h20v10H2V7Zm10 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM5 10h.01M19 14h.01',
  card: 'M2 6h20v12H2V6Zm0 4h20M6 14h4',
  transfer: 'M7 10 3 14l4 4M3 14h14M17 4l4 4-4 4M21 8H7',
  wifiOff: 'M2 8.5a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0M12 19h.01M3 3l18 18',
  cloud: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7Z',
  edit: 'm4 20 4-1L19 8l-3-3L5 16l-1 4ZM14 6l3 3',
  archive: 'M3 5h18v4H3V5Zm2 4v10h14V9M10 13h4',
  filter: 'M3 5h18l-7 8v6l-4-2v-4L3 5Z',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  file: 'M6 3h8l4 4v14H6V3Zm8 0v4h4M9 13h6m-6 4h6',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-1.7-1L15 3.5H9l-.3 2.5a7.5 7.5 0 0 0-1.7 1L4.7 6.1l-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.7 1.7 1l.3 2.5h6l.3-2.5c.6-.3 1.2-.6 1.7-1l2.3.9 2-3.4-2-1.5c.1-.3.1-.7.1-1Z',
  copy: 'M8 8h12v12H8V8Zm-4 8V4h12',
  calendar: 'M4 5h16v16H4V5Zm0 5h16M8 3v4m8-4v4',
}

export type IconName = keyof typeof paths

export function Icon({ name, size = 20, className = '', strokeWidth = 1.75 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
