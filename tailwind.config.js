/** @type {import('tailwindcss').Config} */
// Barcha ranglar CSS o'zgaruvchilaridan (src/styles/tokens.css) keladi —
// light/dark bitta joyda boshqariladi, Tailwind faqat nom beradi.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: 'var(--bg)',
      surface: 'var(--surface)',
      'surface-2': 'var(--surface-2)',
      ink: 'var(--ink)',
      muted: 'var(--muted)',
      line: 'var(--line)',
      'line-strong': 'var(--line-strong)',
      accent: 'var(--accent)',
      'accent-ink': 'var(--accent-ink)',
      'accent-soft': 'var(--accent-soft)',
      'accent-deep': 'var(--accent-deep)',
      'accent-text': 'var(--accent-text)',
      blue: 'var(--blue)',
      'blue-ink': 'var(--blue-ink)',
      'blue-soft': 'var(--blue-soft)',
      good: 'var(--good)',
      'good-soft': 'var(--good-soft)',
      warn: 'var(--warn)',
      'warn-soft': 'var(--warn-soft)',
      crit: 'var(--crit)',
      'crit-soft': 'var(--crit-soft)',
      neutral: 'var(--neutral)',
      'neutral-soft': 'var(--neutral-soft)',
      white: '#ffffff',
      black: '#000000',
    },
    fontFamily: {
      body: ['"Golos Text"', 'Inter', 'system-ui', 'sans-serif'],
      display: ['"IBM Plex Sans Condensed"', '"Golos Text"', 'system-ui', 'sans-serif'],
      mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
    },
    borderRadius: {
      none: '0',
      sm: '6px',
      DEFAULT: '10px',
      lg: '12px',
      xl: '16px',
      full: '9999px',
    },
    extend: {
      spacing: { 11: '44px', 'safe-b': 'env(safe-area-inset-bottom)' },
      boxShadow: {
        sheet: '0 -8px 32px rgba(0,0,0,.18)',
        card: '0 1px 2px rgba(23,27,33,.06)',
      },
    },
  },
  plugins: [],
}
