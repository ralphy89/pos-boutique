import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  MoreHorizontal,
  PackagePlus,
  Search,
  ShieldAlert,
  Tag,
  Pencil,
  Eye,
  Trash2,
} from 'lucide-react'
import {
  createProduct,
  deleteProduct as removeProduct,
  listProducts,
  updateProduct,
} from '../api/products'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { FieldLabel, TextField } from '../components/ui/Field'
import { moneyFromApi, type ProductResponse } from '../types/product'

function formatMoney(htg: number) {
  return `HTG ${htg.toLocaleString()}`
}

export function ProductsScreen() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [category, setCategory] = useState<'All' | string>('All')
  const [onlyLowStock, setOnlyLowStock] = useState(false)
  const [editor, setEditor] = useState<null | { mode: 'create' } | { mode: 'edit'; product: ProductResponse }>(null)
  const [viewProduct, setViewProduct] = useState<ProductResponse | null>(null)
  const [productToDelete, setProductToDelete] = useState<ProductResponse | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const [products, setProducts] = useState<ProductResponse[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['All'])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catalogVersion, setCatalogVersion] = useState(0)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 350)
    return () => window.clearTimeout(t)
  }, [query])

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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const all = await listProducts({ limit: 200 })
        if (cancelled) return
        const cats = new Set<string>()
        for (const p of all) {
          if (p.category) cats.add(p.category)
        }
        setCategoryOptions(['All', ...Array.from(cats).sort()])
      } catch {
        // Category list is optional; filters still work with server params.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [catalogVersion])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const rows = await listProducts({
          q: debouncedQuery || undefined,
          category: category === 'All' ? undefined : category,
          low_stock: onlyLowStock || undefined,
          limit: 200,
        })
        if (cancelled) return
        setProducts(rows)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load products.')
        setProducts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, category, onlyLowStock, catalogVersion])

  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock <= p.min_stock).length,
    [products],
  )

  return (
    <AppShell
      title="Products"
      subtitle="Manage catalog, pricing and stock with precision."
      quickActionLabel="Add product"
      quickActionIcon={PackagePlus}
      onQuickAction={() => setEditor({ mode: 'create' })}
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
                {/* <Button variant="ghost" type="button">
                  <SlidersHorizontal className="h-4 w-4" />
                  Advanced
                </Button> */}
                <Button type="button" onClick={() => setEditor({ mode: 'create' })}>
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
                    className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--bg-1)_92%,white)] px-9 pr-10 text-sm text-ink outline-none transition focus:border-white/20 focus:bg-[color-mix(in_oklab,var(--bg-1)_88%,white)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
                  >
                    {categoryOptions.map((c) => (
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
                  <span>{loading ? '…' : `${products.length} products`}</span>
                  <span className="h-4 w-px bg-white/10" />
                  <span>
                    Alerts:{' '}
                    <span className="font-medium text-ink/75">{loading ? '…' : lowStockCount}</span>
                  </span>
                </div>
              </div>

              <div className="lg:hidden">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-ink/55">
                  <span>{loading ? '…' : `${products.length} products`}</span>
                  <span>
                    Alerts:{' '}
                    <span className="font-medium text-ink/75">{loading ? '…' : lowStockCount}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="px-5 py-4">
            <div className="text-xs font-medium text-ink/55">Catalog</div>
            <div className="mt-1 text-[11px] text-ink/45">Low stock when quantity is at or below minimum stock.</div>
          </div>

          {error ? (
            <div className="border-t border-white/10 px-5 py-3 text-sm text-[color-mix(in_oklab,var(--highlight)_75%,white)]">
              {error}
            </div>
          ) : null}

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
              {loading ? (
                <div className="flex items-center justify-center gap-2 border-t border-white/10 px-5 py-16 text-sm text-ink/55">
                  <Loader2 className="h-5 w-5 animate-spin text-ink/45" />
                  Loading catalog…
                </div>
              ) : products.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-ink/55">
                  No products match your filters.
                </div>
              ) : (
                products.map((p) => {
                  const low = p.stock <= p.min_stock
                  const idKey = String(p.id)
                  return (
                    <div
                      key={p.id}
                      className="group grid gap-3 border-t border-white/10 px-5 py-4 transition hover:bg-white/[0.04] lg:grid-cols-[1.5fr_0.9fr_0.8fr_0.8fr_0.6fr_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium tracking-[-0.02em] text-ink/90">
                            {`00${1000 + p.id}`} - {p.name}
                          </div>
                          {low ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--highlight)_35%,transparent)] bg-[color-mix(in_oklab,var(--highlight)_12%,transparent)] px-2 py-0.5 text-[11px] text-[color-mix(in_oklab,var(--highlight)_80%,white)]">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              Low
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-ink/70 lg:text-sm lg:text-ink/75">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-ink/70">
                          <span className="h-1.5 w-1.5 rounded-full bg-[color-mix(in_oklab,var(--accent-2)_70%,white)]" />
                          {p.category ?? '—'}
                        </span>
                      </div>

                      <div className="text-right text-sm text-ink/80">
                        {formatMoney(moneyFromApi(p.purchase_price))}
                      </div>
                      <div className="text-right text-sm font-medium text-ink/90">
                        {formatMoney(moneyFromApi(p.sale_price))}
                      </div>

                      <div className="text-right text-sm text-ink/80">
                        <span className={low ? 'text-[color-mix(in_oklab,var(--highlight)_82%,white)]' : ''}>
                          {p.stock}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5">
                        <div className="relative" data-menu-root={idKey}>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-ink/75 transition hover:bg-white/[0.05]"
                            aria-label="Actions"
                            title="Actions"
                            aria-haspopup="menu"
                            aria-expanded={openMenuId === idKey}
                            onClick={() => setOpenMenuId((cur) => (cur === idKey ? null : idKey))}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {openMenuId === idKey ? (
                            <div
                              role="menu"
                              className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--bg-1)_88%,black)] shadow-[0_30px_90px_-60px_rgba(0,0,0,0.9)]"
                            >
                              <MenuItem
                                icon={<Eye className="h-4 w-4" />}
                                label="View"
                                onClick={() => {
                                  setOpenMenuId(null)
                                  setViewProduct(p)
                                }}
                              />
                              <MenuItem
                                icon={<Pencil className="h-4 w-4" />}
                                label="Edit"
                                onClick={() => {
                                  setOpenMenuId(null)
                                  setEditor({ mode: 'edit', product: p })
                                }}
                              />
                              <div className="h-px bg-white/10" />
                              <MenuItem
                                danger
                                icon={<Trash2 className="h-4 w-4" />}
                                label="Delete"
                                onClick={() => {
                                  setOpenMenuId(null)
                                  setProductToDelete(p)
                                }}
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

      <ProductEditorPanel
        state={editor}
        onClose={() => setEditor(null)}
        onSuccess={() => {
          setCatalogVersion((v) => v + 1)
          setEditor(null)
        }}
      />
      <ProductViewPanel
        product={viewProduct}
        onClose={() => setViewProduct(null)}
        onEdit={(p) => {
          setViewProduct(null)
          setEditor({ mode: 'edit', product: p })
        }}
      />
      <DeleteProductDialog
        product={productToDelete}
        onClose={() => setProductToDelete(null)}
        onDeleted={(id) => {
          setCatalogVersion((v) => v + 1)
          setProductToDelete(null)
          setViewProduct((v) => (v?.id === id ? null : v))
          setEditor((e) => (e?.mode === 'edit' && e.product.id === id ? null : e))
        }}
      />
    </AppShell>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode
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

type ProductEditorState = null | { mode: 'create' } | { mode: 'edit'; product: ProductResponse }

function ProductEditorPanel({
  state,
  onClose,
  onSuccess,
}: {
  state: ProductEditorState
  onClose: () => void
  onSuccess: () => void
}) {
  const open = state !== null
  const isEdit = state?.mode === 'edit'

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [stock, setStock] = useState('0')
  const [minStock, setMinStock] = useState('0')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!state) return
    if (state.mode === 'create') {
      setName('')
      setCategory('')
      setPurchasePrice('')
      setSalePrice('')
      setStock('0')
      setMinStock('0')
      setStatus('active')
    } else {
      const ep = state.product
      setName(ep.name)
      setCategory(ep.category ?? '')
      setPurchasePrice(moneyToInputString(moneyFromApi(ep.purchase_price)))
      setSalePrice(moneyToInputString(moneyFromApi(ep.sale_price)))
      setStock(String(ep.stock))
      setMinStock(String(ep.min_stock))
      setStatus(ep.status)
    }
    setSubmitError(null)
  }, [state])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!state) return
    setSubmitError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setSubmitError('Product name is required.')
      return
    }

    const pp = parseMoneyInput(purchasePrice)
    const sp = parseMoneyInput(salePrice)
    const st = parseIntNonNegInput(stock)
    const mn = parseIntNonNegInput(minStock)

    if (!pp.ok) {
      setSubmitError('Enter a valid purchase price (0 or more).')
      return
    }
    if (!sp.ok) {
      setSubmitError('Enter a valid sale price (0 or more).')
      return
    }
    if (!st.ok) {
      setSubmitError('Enter a valid stock quantity (whole number, 0 or more).')
      return
    }
    if (!mn.ok) {
      setSubmitError('Enter a valid minimum stock (whole number, 0 or more).')
      return
    }

    const payload = {
      name: trimmedName,
      category: category.trim() ? category.trim() : null,
      purchase_price: pp.value,
      sale_price: sp.value,
      stock: st.value,
      min_stock: mn.value,
      status,
    }

    setSubmitting(true)
    try {
      if (state.mode === 'create') {
        await createProduct(payload)
      } else {
        await updateProduct(state.product.id, payload)
      }
      onSuccess()
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : isEdit ? 'Could not update product.' : 'Could not create product.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={[
        'fixed inset-0 z-40 transition',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={() => !submitting && onClose()}
      />
      <div
        className={[
          'absolute right-0 top-0 h-dvh w-full max-w-[520px] border-l border-white/10 bg-[color-mix(in_oklab,var(--bg-1)_85%,black)] shadow-[0_60px_140px_-80px_rgba(0,0,0,0.95)] transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-sm font-semibold tracking-[-0.02em] text-ink/90">
              {isEdit ? 'Edit product' : 'Create product'}
            </div>
            <div className="mt-1 text-xs text-ink/55">
              {isEdit ? 'Update catalog details. Prices in HTG.' : 'Add an item to your catalog. Prices in HTG.'}
            </div>
          </div>

          <div className="flex-1 overflow-auto px-6 py-5">
            <div className="grid gap-4">
              {submitError ? (
                <div className="rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--highlight)_8%,transparent)] px-3 py-2 text-xs text-[color-mix(in_oklab,var(--highlight)_78%,white)]">
                  {submitError}
                </div>
              ) : null}

              <div className="grid gap-2">
                <FieldLabel htmlFor="pname">Product name</FieldLabel>
                <TextField
                  id="pname"
                  placeholder="Ex: Riz 5kg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  disabled={submitting}
                />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="pcat">Category</FieldLabel>
                <TextField
                  id="pcat"
                  placeholder="Ex: Grocery (optional)"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  autoComplete="off"
                  disabled={submitting}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <FieldLabel htmlFor="pp">Purchase price</FieldLabel>
                  <TextField
                    id="pp"
                    placeholder="HTG"
                    inputMode="decimal"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="sp">Sale price</FieldLabel>
                  <TextField
                    id="sp"
                    placeholder="HTG"
                    inputMode="decimal"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <FieldLabel htmlFor="st">Stock</FieldLabel>
                  <TextField
                    id="st"
                    placeholder="0"
                    inputMode="numeric"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="min">Minimum stock</FieldLabel>
                  <TextField
                    id="min"
                    placeholder="0"
                    inputMode="numeric"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs font-medium text-ink/70">Status</div>
                <div className="mt-1 text-xs text-ink/55">Active products appear in the sale flow.</div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setStatus('active')}
                    className={[
                      'inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition',
                      status === 'active'
                        ? 'border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] text-ink/90'
                        : 'border-white/10 bg-white/[0.02] text-ink/60 hover:bg-white/[0.05]',
                    ].join(' ')}
                  >
                    <CheckCircle2 className="h-4 w-4 text-[var(--accent-2)]" />
                    Active
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setStatus('inactive')}
                    className={[
                      'inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition',
                      status === 'inactive'
                        ? 'border-white/20 bg-white/[0.08] text-ink/90'
                        : 'border-white/10 bg-white/[0.02] text-ink/60 hover:bg-white/[0.05]',
                    ].join(' ')}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 px-6 py-5">
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !state}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEdit ? 'Saving…' : 'Creating…'}
                  </>
                ) : isEdit ? (
                  'Save changes'
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProductViewPanel({
  product,
  onClose,
  onEdit,
}: {
  product: ProductResponse | null
  onClose: () => void
  onEdit: (p: ProductResponse) => void
}) {
  const open = product !== null

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
        {product ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-6 py-5">
              <div className="text-sm font-semibold tracking-[-0.02em] text-ink/90">Product details</div>
              <div className="mt-1 text-xs text-ink/55">ID {product.id}</div>
            </div>
            <div className="flex-1 overflow-auto px-6 py-5">
              <div className="grid gap-4">
                <ViewRow label="Name" value={product.name} />
                <ViewRow label="Category" value={product.category ?? '—'} />
                <ViewRow label="Purchase price" value={formatMoney(moneyFromApi(product.purchase_price))} />
                <ViewRow label="Sale price" value={formatMoney(moneyFromApi(product.sale_price))} />
                <ViewRow label="Stock" value={String(product.stock)} />
                <ViewRow label="Minimum stock" value={String(product.min_stock)} />
                <ViewRow
                  label="Status"
                  value={product.status === 'active' ? 'Active' : 'Inactive'}
                />
                <ViewRow label="Created" value={formatDateTime(product.created_at)} />
                <ViewRow label="Updated" value={formatDateTime(product.updated_at)} />
              </div>
            </div>
            <div className="border-t border-white/10 px-6 py-5">
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" type="button" onClick={onClose}>
                  Close
                </Button>
                <Button type="button" onClick={() => onEdit(product)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-[11px] font-medium text-ink/50">{label}</div>
      <div className="mt-1 text-sm text-ink/90">{value}</div>
    </div>
  )
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function DeleteProductDialog({
  product,
  onClose,
  onDeleted,
}: {
  product: ProductResponse | null
  onClose: () => void
  onDeleted: (id: number) => void
}) {
  const open = product !== null
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (product) setErr(null)
  }, [product])

  async function handleConfirm() {
    if (!product) return
    setBusy(true)
    setErr(null)
    try {
      await removeProduct(product.id)
      onDeleted(product.id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete product.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={[
        'fixed inset-0 z-[45] transition',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
      aria-hidden={!open}
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="absolute left-1/2 top-1/2 w-[min(100%-2rem,400px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-[color-mix(in_oklab,var(--bg-1)_92%,black)] p-6 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.95)]">
        {product ? (
          <>
            <div className="text-sm font-semibold tracking-[-0.02em] text-ink/90">Delete product?</div>
            <p className="mt-2 text-sm text-ink/60">
              <span className="font-medium text-ink/85">{product.name}</span> will be removed from the catalog. This
              cannot be undone.
            </p>
            {err ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--highlight)_8%,transparent)] px-3 py-2 text-xs text-[color-mix(in_oklab,var(--highlight)_78%,white)]">
                {err}
              </div>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleConfirm}
                disabled={busy}
                className="border-[color-mix(in_oklab,var(--highlight)_40%,transparent)] text-[color-mix(in_oklab,var(--highlight)_82%,white)] hover:bg-[color-mix(in_oklab,var(--highlight)_12%,transparent)]"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function moneyToInputString(n: number): string {
  const r = Math.round(n * 100) / 100
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, '')
}

function parseMoneyInput(raw: string): { ok: true; value: number } | { ok: false } {
  const t = raw.trim().replace(',', '.')
  if (t === '') return { ok: false }
  const n = parseFloat(t)
  if (!Number.isFinite(n) || n < 0) return { ok: false }
  return { ok: true, value: Math.round(n * 100) / 100 }
}

function parseIntNonNegInput(raw: string): { ok: true; value: number } | { ok: false } {
  const t = raw.trim()
  if (t === '') return { ok: false }
  if (!/^\d+$/.test(t)) return { ok: false }
  const n = parseInt(t, 10)
  if (!Number.isFinite(n) || n < 0) return { ok: false }
  return { ok: true, value: n }
}
