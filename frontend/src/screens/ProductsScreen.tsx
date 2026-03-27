import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  MoreHorizontal,
  PackagePlus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Tag,
  Pencil,
  Eye,
  Trash2,
} from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { FieldLabel, TextField } from '../components/ui/Field'

type Product = {
  id: string
  name: string
  category: string
  purchasePrice: number
  salePrice: number
  stock: number
  minStock: number
  status: 'active' | 'inactive'
}

function formatMoney(htg: number) {
  return `HTG ${htg.toLocaleString()}`
}

export function ProductsScreen() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'All' | string>('All')
  const [onlyLowStock, setOnlyLowStock] = useState(false)
  const [openCreate, setOpenCreate] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    if (!openMenuId) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const root = target.closest(`[data-menu-root=\"${openMenuId}\"]`)
      if (root) return
      setOpenMenuId(null)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [openMenuId])

  const data = useMemo<Product[]>(
    () => [
      {
        id: 'p1',
        name: 'Riz 5kg',
        category: 'Grocery',
        purchasePrice: 650,
        salePrice: 750,
        stock: 7,
        minStock: 10,
        status: 'active',
      },
      {
        id: 'p2',
        name: 'Huile 1L',
        category: 'Grocery',
        purchasePrice: 280,
        salePrice: 350,
        stock: 12,
        minStock: 8,
        status: 'active',
      },
      {
        id: 'p3',
        name: 'Savon',
        category: 'Household',
        purchasePrice: 35,
        salePrice: 50,
        stock: 3,
        minStock: 6,
        status: 'active',
      },
      {
        id: 'p4',
        name: 'Carte téléphone (100)',
        category: 'Services',
        purchasePrice: 95,
        salePrice: 100,
        stock: 40,
        minStock: 20,
        status: 'active',
      },
      {
        id: 'p5',
        name: 'Biscuit',
        category: 'Snacks',
        purchasePrice: 18,
        salePrice: 25,
        stock: 0,
        minStock: 10,
        status: 'inactive',
      },
    ],
    [],
  )

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const p of data) set.add(p.category)
    return ['All', ...Array.from(set).sort()]
  }, [data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.filter((p) => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q)
      const matchesCategory = category === 'All' || p.category === category
      const low = p.stock <= p.minStock
      const matchesLow = !onlyLowStock || low
      return matchesQuery && matchesCategory && matchesLow
    })
  }, [category, data, onlyLowStock, query])

  return (
    <AppShell
      title="Products"
      subtitle="Manage catalog, pricing and stock with precision."
      quickActionLabel="Add product"
      quickActionIcon={PackagePlus}
      onQuickAction={() => setOpenCreate(true)}
    >
      <div className="grid gap-4">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--accent-2)_10%,transparent),transparent_55%)]" />
          <div className="relative">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-[-0.02em] text-ink/90">Product management</div>
                <div className="mt-1 text-xs text-ink/55">
                  Keep your prices clean, your stock accurate, and your status consistent.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" type="button">
                  <SlidersHorizontal className="h-4 w-4" />
                  Advanced
                </Button>
                <Button type="button" onClick={() => setOpenCreate(true)}>
                  <PackagePlus className="h-4 w-4" />
                  Add product
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_0.6fr_0.5fr_auto] lg:items-end">
              <div className="grid gap-1.5">
                <FieldLabel htmlFor="q">Search</FieldLabel>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                  <TextField
                    id="q"
                    className="pl-9"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by product name…"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <FieldLabel htmlFor="category">Category</FieldLabel>
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-9 pr-10 text-sm text-ink/85 outline-none transition focus:border-white/20 focus:bg-white/[0.04] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={[
                    'inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm transition',
                    onlyLowStock
                      ? 'border-white/15 bg-white/[0.06] text-ink/90'
                      : 'border-white/10 bg-white/[0.03] text-ink/65 hover:bg-white/[0.05] hover:text-ink/80',
                  ].join(' ')}
                  onClick={() => setOnlyLowStock((v) => !v)}
                >
                  <ShieldAlert className="h-4 w-4" />
                  Low stock
                </button>

                <div className="hidden h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-ink/55 lg:flex">
                  <span>{filtered.length} products</span>
                  <span className="h-4 w-px bg-white/10" />
                  <span>
                    Alerts:{' '}
                    <span className="font-medium text-ink/75">
                      {data.filter((p) => p.stock <= p.minStock).length}
                    </span>
                  </span>
                </div>
              </div>

              <div className="lg:hidden">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-ink/55">
                  <span>{filtered.length} products</span>
                  <span>
                    Alerts:{' '}
                    <span className="font-medium text-ink/75">
                      {data.filter((p) => p.stock <= p.minStock).length}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="px-5 py-4">
            <div className="text-xs font-medium text-ink/55">Catalog</div>
            <div className="mt-1 text-[11px] text-ink/45">
              Low stock is flagged when \(stock \\le min\\).
            </div>
          </div>

          <div className="border-t border-white/10">
            <div className="hidden grid-cols-[1.5fr_0.9fr_0.8fr_0.8fr_0.6fr_auto] gap-3 px-5 py-3 text-[11px] font-medium text-ink/50 lg:grid">
              <div>Product</div>
              <div>Category</div>
              <div className="text-right">Purchase</div>
              <div className="text-right">Sale</div>
              <div className="text-right">Stock</div>
              <div className="text-right">Actions</div>
            </div>

            <div className="grid">
              {filtered.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-ink/55">
                  No products match your filters.
                </div>
              ) : (
                filtered.map((p) => {
                  const low = p.stock <= p.minStock
                  return (
                    <div
                      key={p.id}
                      className="group grid gap-3 border-t border-white/10 px-5 py-4 transition hover:bg-white/[0.04] lg:grid-cols-[1.5fr_0.9fr_0.8fr_0.8fr_0.6fr_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium tracking-[-0.02em] text-ink/90">
                            {p.name}
                          </div>
                          {low ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--highlight)_35%,transparent)] bg-[color-mix(in_oklab,var(--highlight)_12%,transparent)] px-2 py-0.5 text-[11px] text-[color-mix(in_oklab,var(--highlight)_80%,white)]">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              Low
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-ink/50">ID: {p.id}</div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-ink/70 lg:text-sm lg:text-ink/75">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-ink/70">
                          <span className="h-1.5 w-1.5 rounded-full bg-[color-mix(in_oklab,var(--accent-2)_70%,white)]" />
                          {p.category}
                        </span>
                      </div>

                      <div className="text-right text-sm text-ink/80">{formatMoney(p.purchasePrice)}</div>
                      <div className="text-right text-sm font-medium text-ink/90">{formatMoney(p.salePrice)}</div>

                      <div className="text-right text-sm text-ink/80">
                        <span className={low ? 'text-[color-mix(in_oklab,var(--highlight)_82%,white)]' : ''}>
                          {p.stock}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5">
                        <div className="relative" data-menu-root={p.id}>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-ink/75 transition hover:bg-white/[0.05]"
                            aria-label="Actions"
                            title="Actions"
                            aria-haspopup="menu"
                            aria-expanded={openMenuId === p.id}
                            onClick={() => setOpenMenuId((cur) => (cur === p.id ? null : p.id))}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {openMenuId === p.id ? (
                            <div
                              role="menu"
                              className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--bg-1)_88%,black)] shadow-[0_30px_90px_-60px_rgba(0,0,0,0.9)]"
                            >
                              <MenuItem
                                icon={<Eye className="h-4 w-4" />}
                                label="View"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <MenuItem
                                icon={<Pencil className="h-4 w-4" />}
                                label="Edit"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="h-px bg-white/10" />
                              <MenuItem
                                danger
                                icon={<Trash2 className="h-4 w-4" />}
                                label="Delete"
                                onClick={() => setOpenMenuId(null)}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </section>
      </div>

      <CreateProductPanel open={openCreate} onClose={() => setOpenCreate(false)} />
    </AppShell>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={[
        'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition',
        danger
          ? 'text-[color-mix(in_oklab,var(--highlight)_82%,white)] hover:bg-[color-mix(in_oklab,var(--highlight)_10%,transparent)]'
          : 'text-ink/80 hover:bg-white/[0.06]',
      ].join(' ')}
      onClick={onClick}
    >
      <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
        {icon}
      </span>
      <span className="font-medium tracking-[-0.01em]">{label}</span>
    </button>
  )
}

function CreateProductPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={[
        'fixed inset-0 z-40 transition',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div
        className={[
          'absolute right-0 top-0 h-dvh w-full max-w-[520px] border-l border-white/10 bg-[color-mix(in_oklab,var(--bg-1)_85%,black)] shadow-[0_60px_140px_-80px_rgba(0,0,0,0.95)] transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-sm font-semibold tracking-[-0.02em] text-ink/90">Create product</div>
            <div className="mt-1 text-xs text-ink/55">Preview panel (UI-only) — save will be wired later.</div>
          </div>

          <div className="flex-1 overflow-auto px-6 py-5">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <FieldLabel htmlFor="pname">Product name</FieldLabel>
                <TextField id="pname" placeholder="Ex: Riz 5kg" />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="pcat">Category</FieldLabel>
                <TextField id="pcat" placeholder="Ex: Grocery" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <FieldLabel htmlFor="pp">Purchase price</FieldLabel>
                  <TextField id="pp" placeholder="HTG" inputMode="numeric" />
                </div>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="sp">Sale price</FieldLabel>
                  <TextField id="sp" placeholder="HTG" inputMode="numeric" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <FieldLabel htmlFor="st">Stock</FieldLabel>
                  <TextField id="st" placeholder="0" inputMode="numeric" />
                </div>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="min">Minimum stock</FieldLabel>
                  <TextField id="min" placeholder="0" inputMode="numeric" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs font-medium text-ink/70">Status</div>
                <div className="mt-1 text-xs text-ink/55">Active products appear in the sale flow.</div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-ink/70">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent-2)]" />
                  Active
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 px-6 py-5">
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={onClose}>
                Create
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
