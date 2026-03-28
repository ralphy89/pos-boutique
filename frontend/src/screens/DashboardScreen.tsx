import {
  Activity,
  ArrowUpRight,
  Barcode,
  Boxes,
  CircleAlert,
  ReceiptText,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'

export function DashboardScreen() {
  const navigate = useNavigate()

  return (
    <AppShell
      title="Dashboard"
      subtitle="Executive control of sales and stock — at a glance."
      quickActionLabel="New sale"
      onQuickAction={() => navigate('/sales/new')}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_44px_140px_-100px_rgba(0,0,0,0.95)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_0%,rgba(255,255,255,0.08),transparent_58%)]" />
          <div className="pointer-events-none absolute -top-28 right-[-180px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_28%,transparent),transparent)] blur-3xl opacity-70" />
          <div className="pointer-events-none absolute -bottom-28 left-[-220px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent-2)_22%,transparent),transparent)] blur-3xl opacity-60" />

          <div className="relative">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-ink/60">
                  <Sparkles className="h-3.5 w-3.5 text-ink/70" />
                  Precision mode
                </div>
                <h2 className="mt-4 text-balance text-2xl font-semibold tracking-[-0.04em] text-ink/92">
                  Keep control of today’s operations — without noise.
                </h2>
                <p className="mt-2 max-w-[70ch] text-pretty text-sm leading-relaxed text-ink/60">
                  This space is designed for speed at the counter and clarity for owners. Sales and stock signals are
                  surfaced as actionable insights.
                </p>
              </div>

              <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] font-medium text-ink/55">Executive summary</div>
                <div className="text-sm font-semibold tracking-[-0.03em] text-ink/90">Stable • Ready</div>
                <div className="text-xs text-ink/55">No alerts. You’re clear to operate.</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
              <Kpi
                title="Today’s sales"
                value="HTG 0"
                meta="Gross sales"
                icon={<ReceiptText className="h-4 w-4" />}
              />
              {/* Cash register module will be implemented later */}
              {/* <Kpi title="Cash received" value="HTG 0" meta="Cash + mobile money" icon={<Wallet className="h-4 w-4" />} /> */}
              <Kpi title="Transactions" value="0" meta="Validated today" icon={<Activity className="h-4 w-4" />} />
              <Kpi title="Low stock products" value="0" meta="Needs attention" icon={<Boxes className="h-4 w-4" />} />
              {/* Credit module will be implemented later */}
              {/* <Kpi title="Active debtors" value="0" meta="Customers owing" icon={<Users className="h-4 w-4" />} /> */}
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <Card title="Quick actions" subtitle="Move fast, stay precise">
            <div className="grid grid-cols-2 gap-2">
              <QuickAction
                to="/sales/new"
                icon={<Barcode className="h-4 w-4" />}
                label="Scan & sell"
                hint="New sale flow"
              />
              <QuickAction
                to="/products"
                icon={<Boxes className="h-4 w-4" />}
                label="Products"
                hint="Catalog management"
              />
              <QuickAction
                to="/customers"
                icon={<Users className="h-4 w-4" />}
                label="Customers"
                hint="Profiles & history"
              />
              <QuickAction
                to="/cash-register"
                icon={<Wallet className="h-4 w-4" strokeWidth={1.75} />}
                label="Cash register"
                hint="Session & reconciliation"
              />
              {/* Reports module will be implemented later */}
              {/* <QuickAction icon={<TrendingUp className="h-4 w-4" />} label="Reports" hint="Insights" /> */}
            </div>
          </Card>

          <Card title="Low stock alerts" subtitle="Prevent stockouts before they happen">
            <EmptyList icon={<CircleAlert className="h-4 w-4" />} text="No low-stock items right now." />
          </Card>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Reports module will be implemented later */}
        {/* <Card title="Top-selling products" subtitle="High velocity items (today)">
          <EmptyList icon={<TrendingUp className="h-4 w-4" />} text="No sales yet — top products will appear here." />
        </Card> */}

        <div className="grid gap-4">
          {/* Credit module will be implemented later */}
          {/* <Card title="Recent customer debts" subtitle="Credit movements (latest)">
            <EmptyList icon={<CreditCard className="h-4 w-4" />} text="No credit entries yet." />
          </Card> */}
          <Card title="Recent activity" subtitle="Operator actions (audit-friendly)">
            <EmptyList icon={<Activity className="h-4 w-4" />} text="No activity recorded yet." />
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_34px_130px_-96px_rgba(0,0,0,0.92)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_80%_at_20%_0%,rgba(255,255,255,0.06),transparent_55%)]" />
      <div className="pointer-events-none absolute -top-20 right-[-120px] h-64 w-64 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_20%,transparent),transparent)] blur-2xl opacity-70" />
      <div className="relative">
        <div className="text-sm font-semibold tracking-[-0.02em] text-ink/90">{title}</div>
        <div className="mt-1 text-xs text-ink/55">{subtitle}</div>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  )
}

function Kpi({
  title,
  value,
  meta,
  icon,
}: {
  title: string
  value: string
  meta: string
  icon: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_55%)]" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-ink/55">{title}</div>
          <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink/92">{value}</div>
          <div className="mt-1 text-xs text-ink/45">{meta}</div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-ink/80">
          {icon}
        </div>
      </div>
    </div>
  )
}

function QuickAction({ label, hint, icon, to }: { label: string; hint: string; icon: React.ReactNode; to: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:bg-white/[0.04]"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-ink/85">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium tracking-[-0.02em] text-ink/90">{label}</div>
          <div className="text-xs text-ink/50">{hint}</div>
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-ink/40 transition group-hover:text-ink/70" />
    </Link>
  )
}

function EmptyList({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-ink/80">
        {icon}
      </div>
      <div className="text-sm text-ink/60">{text}</div>
    </div>
  )
}

