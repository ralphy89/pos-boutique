import { type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { BackToHome } from '../BackToHome'
import { BrandMark } from '../BrandMark'
import { Button } from '../ui/Button'

type NavItem = {
  to: string
  label: string
  icon: ReactNode
}

const NAV: NavItem[] = [
  { to: '/home', label: 'Home', icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: '/sales/new', label: 'New sale', icon: <ReceiptText className="h-4 w-4" /> },
  { to: '/products', label: 'Products', icon: <Package className="h-4 w-4" /> },
  { to: '/customers', label: 'Customers', icon: <Users className="h-4 w-4" /> },
  // { to: '/inventory', label: 'Inventory', icon: <Boxes className="h-4 w-4" /> },
  // { to: '/credit', label: 'Credit', icon: <CreditCard className="h-4 w-4" /> },
  // { to: '/cash', label: 'Cash register', icon: <Wallet className="h-4 w-4" /> },
  // { to: '/reports', label: 'Reports', icon: <BarChart3 className="h-4 w-4" /> },
]

export function AppShell({
  title,
  subtitle,
  quickActionLabel = 'New sale',
  quickActionIcon: QuickIcon = ReceiptText,
  onQuickAction,
  children,
}: {
  title: string
  subtitle?: string
  quickActionLabel?: string
  quickActionIcon?: LucideIcon
  onQuickAction?: () => void
  children: ReactNode
}) {
  const { pathname } = useLocation()
  const showBack = pathname !== '/home'

  return (
    <div className="min-h-dvh">
      <div className="mx-auto grid min-h-dvh max-w-[1400px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="relative hidden border-r border-white/10 lg:block">
          <div className="sticky top-0 flex h-dvh flex-col px-5 py-6">
            <div className="flex items-center gap-3">
              <BrandMark size={44} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-[-0.02em] text-ink/90">
                  POS Boutique
                </div>
                <div className="truncate text-xs text-ink/55">Retail control center</div>
              </div>
            </div>

            <div className="mt-6 grid gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition',
                      isActive
                        ? 'border-white/15 bg-white/[0.06] text-ink/90'
                        : 'border-transparent bg-transparent text-ink/60 hover:border-white/10 hover:bg-white/[0.04] hover:text-ink/80',
                    )
                  }
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-ink/80">
                    {item.icon}
                  </span>
                  <span className="font-medium tracking-[-0.01em]">{item.label}</span>
                </NavLink>
              ))}
            </div>

            <div className="mt-auto pt-6">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs font-medium text-ink/70">Workspace</div>
                <div className="mt-1 text-xs text-ink/55">
                  Deployable in cloud or local network. Built for daily operations.
                </div>
                <Button variant="ghost" className="mt-3 h-10 w-full justify-center" type="button">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-[color-mix(in_oklab,var(--bg-1)_82%,transparent)] backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-6 py-5">
              <div className="flex min-w-0 items-start gap-3">
                {showBack ? <BackToHome className="mt-0.5" /> : null}
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold tracking-[-0.03em] text-ink/92">
                    {title}
                  </div>
                  {subtitle ? <div className="truncate text-xs text-ink/55">{subtitle}</div> : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" onClick={onQuickAction}>
                  <QuickIcon className="h-4 w-4" />
                  {quickActionLabel}
                </Button>

                <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 md:flex">
                  <div className="h-8 w-8 rounded-xl border border-white/10 bg-[radial-gradient(120%_120%_at_20%_0%,rgba(255,255,255,0.10),rgba(255,255,255,0.03))]" />
                  <div className="leading-tight">
                    <div className="text-xs font-medium text-ink/80">Owner</div>
                    <div className="text-[11px] text-ink/50">admin@shop.ht</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1120px] px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

