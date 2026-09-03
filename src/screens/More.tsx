import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/Shell'
import { Row } from '@/components/ui'
import { Icon, type IconName } from '@/components/Icon'

const items: { to?: string; href?: string; label: string; sub?: string; icon: IconName }[] = [
  { to: '/more/sales', label: 'Sotuvlar tarixi', sub: 'Kun boʻyicha, filtr bilan', icon: 'clock' },
  { to: '/more/settings', label: 'Sozlamalar', sub: 'Doʻkon, chek, maʼlumotlar', icon: 'settings' },
  { href: 'https://t.me/', label: 'Yordam', sub: 'Telegram orqali yozing', icon: 'phone' },
]

export default function More() {
  const nav = useNavigate()
  return (
    <div>
      <Header title="Yana" />
      <ul className="mx-4 mt-4 overflow-hidden rounded-lg border border-line">
        {items.map((it) => (
          <li key={it.label}>
            <Row onClick={() => (it.to ? nav(it.to) : window.open(it.href, '_blank'))}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted"><Icon name={it.icon} size={18} /></span>
              <span className="flex-1"><span className="block font-medium">{it.label}</span>{it.sub && <span className="block text-[13px] text-muted">{it.sub}</span>}</span>
              <Icon name="chevronRight" size={18} className="text-line-strong" />
            </Row>
          </li>
        ))}
      </ul>
      <p className="mt-6 px-4 text-center text-[12px] text-muted">Rasta v0.1 · MVP-1</p>
    </div>
  )
}
