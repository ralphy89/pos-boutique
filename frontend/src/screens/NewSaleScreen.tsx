import { Banknote, Barcode, CreditCard, Minus, Plus, User } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { FieldLabel, TextField } from '../components/ui/Field'

export function NewSaleScreen() {
  return (
    <AppShell title="New sale" subtitle="Fast, precise checkout." quickActionLabel="Validate">
      <div className="mb-6 flex justify-end">
        <Button variant="ghost" type="button">
          <User className="h-4 w-4" />
          Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_55%)]" />
          <div className="relative">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold tracking-[-0.02em] text-ink/90">Items</div>
                <div className="mt-1 text-xs text-ink/55">Scan barcode or search by name.</div>
              </div>
              <div className="relative w-full md:max-w-[360px]">
                <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                <TextField className="pl-9" placeholder="Scan / Search…" />
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <div className="grid grid-cols-[1fr_120px_120px] gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-2.5 text-[11px] font-medium text-ink/50">
                <div>Product</div>
                <div className="text-center">Qty</div>
                <div className="text-right">Total</div>
              </div>
              <div className="px-4 py-10 text-center text-sm text-ink/55">
                Add products to start the sale.
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--accent-2)_14%,transparent),transparent_55%)]" />
          <div className="relative">
            <div className="text-sm font-semibold tracking-[-0.02em] text-ink/90">Summary</div>
            <div className="mt-1 text-xs text-ink/55">Cash, MonCash, transfer, or credit.</div>

            <div className="mt-5 grid gap-3">
              <SummaryLine label="Subtotal" value="HTG 0" />
              <SummaryLine label="Discount" value="HTG 0" />
              <SummaryLine label="Total" value="HTG 0" strong />
            </div>

            <div className="mt-5 grid gap-2">
              <div className="text-xs font-medium text-ink/70">Payment</div>
              <div className="grid grid-cols-2 gap-2">
                <PayChip icon={<Banknote className="h-4 w-4" />} label="Cash" />
                <PayChip icon={<CreditCard className="h-4 w-4" />} label="MonCash" />
                <PayChip icon={<CreditCard className="h-4 w-4" />} label="Transfer" />
                <PayChip icon={<CreditCard className="h-4 w-4" />} label="Credit" />
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <FieldLabel htmlFor="note">Note (optional)</FieldLabel>
              <TextField id="note" placeholder="Ex: partial payment, delivery, etc." />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="ghost" type="button" className="h-11">
                <Minus className="h-4 w-4" />
                Remove
              </Button>
              <Button type="button" className="h-11">
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-xs text-ink/55">{label}</div>
      <div className={strong ? 'text-sm font-semibold tracking-[-0.02em] text-ink/92' : 'text-xs font-medium text-ink/80'}>
        {value}
      </div>
    </div>
  )
}

function PayChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left text-xs text-ink/70 transition hover:bg-white/[0.04]"
    >
      <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-ink/80">
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  )
}
