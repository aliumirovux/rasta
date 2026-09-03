import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

interface ToastItem { id: number; text: string; action?: { label: string; onClick: () => void }; tone?: 'default' | 'crit' }
const Ctx = createContext<(t: Omit<ToastItem, 'id'>) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef<Record<number, number>>({})
  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs.slice(-2), { ...t, id }])
    timers.current[id] = window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), t.action ? 5000 : 2800)
  }, [])
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-h)+12px)] z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-lg px-4 py-2.5 text-sm shadow-sheet ${t.tone === 'crit' ? 'bg-crit text-white' : 'bg-ink text-bg'}`}>
            <Icon name={t.tone === 'crit' ? 'alert' : 'check'} size={16} />
            <span>{t.text}</span>
            {t.action && (
              <button className="ml-1 font-semibold underline-offset-2 hover:underline" onClick={() => { t.action?.onClick(); setItems((xs) => xs.filter((x) => x.id !== t.id)) }}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
export const useToast = () => useContext(Ctx)
