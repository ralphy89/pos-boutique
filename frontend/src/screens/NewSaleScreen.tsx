import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  ArrowUpRight,
  Banknote,
  Barcode,
  CreditCard,
  Loader2,
  Minus,
  Percent,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCustomerApi, listCustomersApi } from '../api/customers'
import { getProduct, listProducts } from '../api/products'
import { createSale } from '../api/sales'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { FieldLabel, TextField } from '../components/ui/Field'
import { printSaleReceipt } from '../utils/printReceipt'
import { creditLimitFromApi, type CustomerDetailResponse, type CustomerResponse } from '../types/customer'
import type { PaymentMethod } from '../types/sale'
import { moneyFromApi, type ProductResponse } from '../types/product'

export type SaleCartLine = {
  productId: number
  productName: string
  unitPrice: number
  quantity: number
  maxStock: number
}

function formatMoney(htg: number) {
  return `HTG ${htg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatTotalForInput(n: number): string {
  const r = Math.round(Math.max(0, n) * 100) / 100
  if (r === 0) return '0'
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, '')
}

/** Parse amount user typed; result is clamped to [0, subtotal]. */
function parseSaleTotalInput(raw: string, subtotal: number): number {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '' || t === '.') return 0
  const n = parseFloat(t)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(Math.round(n * 100) / 100, subtotal))
}

type DiscountPreset = 'none' | 'pct5' | 'pct10' | 'pct15'

const DISCOUNT_OPTIONS: { id: DiscountPreset; label: string; hint: string }[] = [
  { id: 'none', label: 'None', hint: 'No discount' },
  { id: 'pct5', label: '5%', hint: 'Off subtotal' },
  { id: 'pct10', label: '10%', hint: 'Off subtotal' },
  { id: 'pct15', label: '15%', hint: 'Off subtotal' },
]

function discountFromPreset(preset: DiscountPreset, subtotal: number): number {
  if (preset === 'none' || subtotal <= 0) return 0
  const rate = preset === 'pct5' ? 0.05 : preset === 'pct10' ? 0.1 : 0.15
  return Math.round(subtotal * rate * 100) / 100
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: ReactNode; hint?: string }[] = [
  { id: 'cash', label: 'Cash', icon: <Banknote className="h-4 w-4" /> },
  { id: 'moncash', label: 'MonCash', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'transfer', label: 'Transfer', icon: <CreditCard className="h-4 w-4" /> },
  {
    id: 'credit',
    label: 'Credit',
    hint: 'On customer account',
    icon: <CreditCard className="h-4 w-4" />,
  },
]

export function NewSaleScreen() {
  const searchRef = useRef<HTMLInputElement>(null)
  const custSearchRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [suggestions, setSuggestions] = useState<ProductResponse[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [pickOpen, setPickOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [cart, setCart] = useState<SaleCartLine[]>([])

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailResponse | null>(null)
  const [custSearch, setCustSearch] = useState('')
  const [debouncedCustSearch, setDebouncedCustSearch] = useState('')
  const [custSuggestions, setCustSuggestions] = useState<CustomerResponse[]>([])
  const [custLoading, setCustLoading] = useState(false)
  const [custError, setCustError] = useState<string | null>(null)
  const [custPickOpen, setCustPickOpen] = useState(false)
  const [custHighlightIndex, setCustHighlightIndex] = useState(0)

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [discountPreset, setDiscountPreset] = useState<DiscountPreset>('none')
  const [notes, setNotes] = useState('')
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [totalInputStr, setTotalInputStr] = useState('0')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [printAfterSave, setPrintAfterSave] = useState(true)

  useEffect(() => {
    setCheckoutError(null)
  }, [cart])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 280)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedCustSearch(custSearch.trim()), 280)
    return () => window.clearTimeout(t)
  }, [custSearch])

  useEffect(() => {
    let cancelled = false
    const q = debouncedSearch

    if (!q) {
      setSuggestions([])
      setSearchLoading(false)
      setSearchError(null)
      return
    }

    setSearchLoading(true)
    setSearchError(null)
    ;(async () => {
      try {
        const rows = await listProducts({ q, limit: 30 })
        if (cancelled) return
        const active = rows.filter((p) => p.status === 'active')
        setSuggestions(active)
        setHighlightIndex(0)
      } catch (e) {
        if (cancelled) return
        setSuggestions([])
        setSearchError(e instanceof Error ? e.message : 'Search failed.')
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [debouncedSearch])

  useEffect(() => {
    if (!custPickOpen) return
    let cancelled = false
    const q = debouncedCustSearch

    setCustLoading(true)
    setCustError(null)
    ;(async () => {
      try {
        const rows = await listCustomersApi(q ? { q, limit: 40 } : { limit: 40 })
        if (cancelled) return
        const active = rows.filter((c) => c.status === 'active')
        setCustSuggestions(active)
        setCustHighlightIndex(0)
      } catch (e) {
        if (cancelled) return
        setCustSuggestions([])
        setCustError(e instanceof Error ? e.message : 'Could not load customers.')
      } finally {
        if (!cancelled) setCustLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [debouncedCustSearch, custPickOpen])

  useEffect(() => {
    if (!pickOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null
      if (!el) return
      if (el.closest('[data-sale-search-root]')) return
      setPickOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [pickOpen])

  useEffect(() => {
    if (!custPickOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null
      if (!el) return
      if (el.closest('[data-sale-customer-root]')) return
      setCustPickOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [custPickOpen])

  function applySelectedCustomer(detail: CustomerDetailResponse) {
    setSelectedCustomer(detail)
    setCustSearch('')
    setDebouncedCustSearch('')
    setCustSuggestions([])
    setCustPickOpen(false)
    setCustError(null)
  }

  async function selectCustomerFromList(c: CustomerResponse) {
    if (c.status !== 'active') return
    setCustError(null)
    try {
      const detail = await getCustomerApi(c.id)
      if (detail.status !== 'active') return
      applySelectedCustomer(detail)
    } catch (e) {
      setCustError(e instanceof Error ? e.message : 'Could not load customer.')
    }
  }

  async function trySelectCustomerById(raw: string): Promise<boolean> {
    const t = raw.trim()
    if (!/^\d+$/.test(t)) return false
    const id = parseInt(t, 10)
    if (id < 1) return false
    try {
      const detail = await getCustomerApi(id)
      if (detail.status !== 'active') return false
      applySelectedCustomer(detail)
      return true
    } catch {
      return false
    }
  }

  function onCustomerSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setCustPickOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (custSuggestions.length === 0) return
      setCustHighlightIndex((i) => Math.min(i + 1, custSuggestions.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCustHighlightIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      void (async () => {
        if (await trySelectCustomerById(custSearch)) return
        const pick = custSuggestions[custHighlightIndex] ?? custSuggestions[0]
        if (pick) void selectCustomerFromList(pick)
      })()
    }
  }

  function addProductToCart(p: ProductResponse) {
    if (p.status !== 'active') return
    if (p.stock <= 0) return

    setCart((prev) => {
      const i = prev.findIndex((x) => x.productId === p.id)
      if (i >= 0) {
        const line = prev[i]!
        if (line.quantity >= line.maxStock) return prev
        const next = [...prev]
        next[i] = { ...line, quantity: line.quantity + 1 }
        return next
      }
      return [
        ...prev,
        {
          productId: p.id,
          productName: p.name,
          unitPrice: moneyFromApi(p.sale_price),
          quantity: 1,
          maxStock: p.stock,
        },
      ]
    })
    setSearch('')
    setDebouncedSearch('')
    setSuggestions([])
    setPickOpen(false)
    searchRef.current?.focus()
  }

  async function tryAddByProductId(raw: string): Promise<boolean> {
    const t = raw.trim()
    if (!/^\d+$/.test(t)) return false
    const id = parseInt(t, 10)
    if (id < 1) return false
    try {
      const p = await getProduct(id)
      if (p.status !== 'active' || p.stock <= 0) return false
      addProductToCart(p)
      return true
    } catch {
      return false
    }
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setPickOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (suggestions.length === 0) return
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      void (async () => {
        if (await tryAddByProductId(search)) return
        const pick = suggestions[highlightIndex] ?? suggestions[0]
        if (pick) addProductToCart(pick)
      })()
    }
  }

  function setLineQty(productId: number, qty: number) {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((l) => l.productId !== productId)
      const line = prev.find((l) => l.productId === productId)
      if (!line) return prev
      const nextQty = Math.min(qty, line.maxStock)
      return prev.map((l) => (l.productId === productId ? { ...l, quantity: nextQty } : l))
    })
  }

  function removeLine(productId: number) {
    setCart((prev) => prev.filter((l) => l.productId !== productId))
  }

  const subtotal = useMemo(
    () => Math.round(cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0) * 100) / 100,
    [cart],
  )

  const discountAmount = useMemo(
    () => discountFromPreset(discountPreset, subtotal),
    [discountPreset, subtotal],
  )

  useEffect(() => {
    const computed = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100)
    setTotalInputStr(formatTotalForInput(computed))
  }, [subtotal, discountAmount])

  const parsedTotal = useMemo(
    () => parseSaleTotalInput(totalInputStr, subtotal),
    [totalInputStr, subtotal],
  )

  const creditCheckoutPreview = useMemo(() => {
    if (paymentMethod !== 'credit' || !selectedCustomer) return null
    const currentDebt = moneyFromApi(selectedCustomer.debt_balance)
    const limit = creditLimitFromApi(selectedCustomer.credit_limit)
    const after = Math.round((currentDebt + parsedTotal) * 100) / 100
    const overLimit = limit != null && limit > 0 && after > limit + 0.0001
    return { currentDebt, limit, after, overLimit }
  }, [paymentMethod, selectedCustomer, parsedTotal])

  const effectiveDiscount = useMemo(
    () => Math.max(0, Math.round((subtotal - parsedTotal) * 100) / 100),
    [subtotal, parsedTotal],
  )

  const canOpenConfirm = useCallback((): boolean => {
    setCheckoutSuccess(null)
    if (cart.length === 0) {
      setCheckoutError('Add at least one product.')
      return false
    }
    if (paymentMethod === 'credit' && !selectedCustomer) {
      setCheckoutError('Credit payment requires a customer. Select one above.')
      return false
    }
    if (paymentMethod === 'credit' && selectedCustomer) {
      const currentDebt = moneyFromApi(selectedCustomer.debt_balance)
      const limit = creditLimitFromApi(selectedCustomer.credit_limit)
      const saleTotal = parseSaleTotalInput(totalInputStr, subtotal)
      const after = Math.round((currentDebt + saleTotal) * 100) / 100
      if (limit != null && limit > 0 && after > limit + 0.0001) {
        setCheckoutError('This sale would exceed the customer’s credit limit.')
        return false
      }
    }
    setCheckoutError(null)
    return true
  }, [cart.length, paymentMethod, selectedCustomer, subtotal, totalInputStr])

  const handleValidate = useCallback(async () => {
    if (!canOpenConfirm()) return
    setIsSubmitting(true)
    try {
      const finalTotal = parseSaleTotalInput(totalInputStr, subtotal)
      const discountToSend = Math.round((subtotal - finalTotal) * 100) / 100
      const saved = await createSale({
        customer_id: selectedCustomer?.id ?? null,
        payment_method: paymentMethod,
        discount: discountToSend > 0 ? discountToSend : null,
        items: cart.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
        notes: notes.trim(),
      })
      if (printAfterSave) {
        try {
          printSaleReceipt(saved)
        } catch (e) {
          // Printing can be blocked by browser settings; keep sale saved and show message.
          setCheckoutSuccess('Sale saved successfully (printing blocked).')
        }
      }
      setCart([])
      setSelectedCustomer(null)
      setNotes('')
      setPaymentMethod('cash')
      setDiscountPreset('none')
      setCheckoutSuccess('Sale saved successfully.')
      window.setTimeout(() => setCheckoutSuccess(null), 5000)
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Could not complete sale.')
    } finally {
      setIsSubmitting(false)
    }
  }, [canOpenConfirm, cart, notes, paymentMethod, printAfterSave, selectedCustomer, subtotal, totalInputStr])

  return (
    <AppShell
      title="New sale"
      subtitle="Fast, precise checkout."
      quickActionLabel={isSubmitting ? 'Saving…' : 'Validate sale'}
      quickActionDisabled={cart.length === 0 || isSubmitting || Boolean(creditCheckoutPreview?.overLimit)}
      onQuickAction={() => {
        if (!canOpenConfirm()) return
        setConfirmOpen(true)
      }}
    >
      <div className="mb-6 flex justify-end">
        <div
          className="w-full max-w-[min(100%,22rem)] sm:max-w-[24rem]"
          data-sale-customer-root
        >
          <div className="mb-1.5 text-right text-[11px] text-ink/50">
            Customer <span className="text-ink/40">· optional · credit needs one</span>
          </div>

          {selectedCustomer ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-ink/80">
                    <User className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 text-left">
                    <div className="truncate text-sm font-medium tracking-[-0.02em] text-ink/90">
                      {selectedCustomer.name}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-ink/50">
                      {selectedCustomer.phone || 'No phone'}
                      <span className="text-ink/35"> · #{selectedCustomer.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                  <Button
                    variant="ghost"
                    type="button"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => {
                      setSelectedCustomer(null)
                      setCustPickOpen(true)
                      window.setTimeout(() => custSearchRef.current?.focus(), 0)
                    }}
                  >
                    Change
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    className="h-8 px-2.5 text-xs text-ink/55 hover:text-[color-mix(in_oklab,var(--highlight)_75%,white)]"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <FieldLabel htmlFor="cust-q" className="sr-only">
                Search customer
              </FieldLabel>
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
              <TextField
                ref={custSearchRef}
                id="cust-q"
                className="pl-9 pr-10"
                placeholder="Search name, phone, or ID…"
                value={custSearch}
                onChange={(e) => {
                  setCustSearch(e.target.value)
                  setCustPickOpen(true)
                }}
                onFocus={() => setCustPickOpen(true)}
                onKeyDown={onCustomerSearchKeyDown}
                autoComplete="off"
              />
              {custLoading ? (
                <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink/40" />
              ) : (
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
              )}

              {custPickOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[min(280px,45dvh)] overflow-auto rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--bg-1)_94%,black)] py-1 text-left shadow-[0_24px_80px_-40px_rgba(0,0,0,0.95)]">
                  {custError ? (
                    <div className="px-3 py-3 text-xs text-[color-mix(in_oklab,var(--highlight)_78%,white)]">
                      {custError}
                    </div>
                  ) : custLoading ? (
                    <div className="flex items-center gap-2 px-3 py-3 text-xs text-ink/55">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading customers…
                    </div>
                  ) : custSuggestions.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-ink/55">
                      {custSearch.trim() ? 'No active customers match.' : 'No active customers found.'}
                    </div>
                  ) : (
                    custSuggestions.map((c, idx) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => void selectCustomerFromList(c)}
                        className={[
                          'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition',
                          idx === custHighlightIndex ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]',
                          'text-ink/90',
                        ].join(' ')}
                      >
                        <div className="truncate font-medium tracking-[-0.02em]">{c.name}</div>
                        <div className="text-[11px] text-ink/50">
                          {c.phone || 'No phone'} · ID {c.id}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_55%)]" />
          <div className="relative">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold tracking-[-0.02em] text-ink/90">Items</div>
                <div className="mt-1 text-xs text-ink/55">
                  Search by name or enter product ID. Barcode scanners type into the same field.
                </div>
              </div>
              <div className="relative w-full md:max-w-[400px]" data-sale-search-root>
                <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                <TextField
                  ref={searchRef}
                  className="pl-9 pr-10"
                  placeholder="Search name, scan, or ID + Enter…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPickOpen(true)
                  }}
                  onFocus={() => setPickOpen(true)}
                  onKeyDown={onSearchKeyDown}
                  autoComplete="off"
                />
                {searchLoading ? (
                  <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink/40" />
                ) : (
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                )}

                {pickOpen && search.trim() ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[min(320px,50dvh)] overflow-auto rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--bg-1)_94%,black)] py-1 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.95)]">
                    {searchError ? (
                      <div className="px-3 py-3 text-xs text-[color-mix(in_oklab,var(--highlight)_78%,white)]">
                        {searchError}
                      </div>
                    ) : searchLoading ? (
                      <div className="flex items-center gap-2 px-3 py-3 text-xs text-ink/55">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching…
                      </div>
                    ) : suggestions.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-ink/55">No active products match.</div>
                    ) : (
                      suggestions.map((p, idx) => {
                        const out = p.stock <= 0
                        const price = moneyFromApi(p.sale_price)
                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={out}
                            onClick={() => !out && addProductToCart(p)}
                            className={[
                              'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition',
                              idx === highlightIndex ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]',
                              out ? 'cursor-not-allowed opacity-45' : 'text-ink/90',
                            ].join(' ')}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium tracking-[-0.02em]">{p.name}</div>
                              <div className="mt-0.5 text-[11px] text-ink/50">
                                ID {p.id}
                                {p.category ? ` · ${p.category}` : ''}
                                {out ? ' · Out of stock' : ` · Stock ${p.stock}`}
                              </div>
                            </div>
                            <div className="shrink-0 text-xs font-medium text-ink/75">{formatMoney(price)}</div>
                          </button>
                        )
                      })
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <div className="text-xs text-ink/45">
                {cart.length} line{cart.length !== 1 ? 's' : ''}
              </div>
              <Button
                variant="ghost"
                type="button"
                className="h-9 text-xs"
                disabled={cart.length === 0}
                onClick={() => setCart([])}
              >
                Clear cart
              </Button>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
              <div className="grid grid-cols-[1fr_120px_120px_44px] gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-2.5 text-[11px] font-medium text-ink/50">
                <div>Product</div>
                <div className="text-center">Qty</div>
                <div className="text-right">Line total</div>
                <div />
              </div>
              {cart.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-ink/55">Add products to start the sale.</div>
              ) : (
                <div className="divide-y divide-white/10">
                  {cart.map((line) => {
                    const lineTotal = line.unitPrice * line.quantity
                    return (
                      <div
                        key={line.productId}
                        className="grid grid-cols-[1fr_120px_120px_44px] items-center gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium tracking-[-0.02em] text-ink/90">
                            {line.productName}
                          </div>
                          <div className="text-[11px] text-ink/45">
                            {formatMoney(line.unitPrice)} each · max {line.maxStock}
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-ink/80 transition hover:bg-white/[0.06]"
                            aria-label="Decrease quantity"
                            onClick={() => setLineQty(line.productId, line.quantity - 1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[2ch] text-center text-sm tabular-nums text-ink/90">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-ink/80 transition hover:bg-white/[0.06] disabled:opacity-35"
                            aria-label="Increase quantity"
                            disabled={line.quantity >= line.maxStock}
                            onClick={() => setLineQty(line.productId, line.quantity + 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="text-right text-sm font-medium text-ink/90">{formatMoney(lineTotal)}</div>
                        <button
                          type="button"
                          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.02] text-ink/55 transition hover:border-white/15 hover:bg-white/[0.05] hover:text-[color-mix(in_oklab,var(--highlight)_75%,white)]"
                          aria-label="Remove line"
                          onClick={() => removeLine(line.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--accent-2)_14%,transparent),transparent_55%)]" />
          <div className="relative">
            <div className="text-sm font-semibold tracking-[-0.02em] text-ink/90">Summary</div>
            <div className="mt-1 text-xs text-ink/55">Cash, MonCash, transfer, or credit.</div>

            {checkoutError ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--highlight)_8%,transparent)] px-3 py-2 text-xs text-[color-mix(in_oklab,var(--highlight)_78%,white)]">
                {checkoutError}
              </div>
            ) : null}
            {checkoutSuccess ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--accent-2)_10%,transparent)] px-3 py-2 text-xs text-ink/80">
                {checkoutSuccess}
              </div>
            ) : null}

            <div className="mt-5 grid gap-3">
              <SummaryLine
                label="Customer"
                value={
                  selectedCustomer
                    ? selectedCustomer.name.length > 28
                      ? `${selectedCustomer.name.slice(0, 26)}…`
                      : selectedCustomer.name
                    : 'Walk-in'
                }
              />
              <SummaryLine label="Subtotal" value={formatMoney(subtotal)} />
              <SummaryLine label="Discount" value={formatMoney(effectiveDiscount)} />
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <FieldLabel htmlFor="sale-total" className="!text-xs !text-ink/55">
                  Total
                </FieldLabel>
                <div className="flex min-w-0 max-w-[70%] items-center justify-end gap-2">
                  <span className="shrink-0 text-xs font-medium text-ink/45">HTG</span>
                  <TextField
                    id="sale-total"
                    className="h-9 min-w-0 flex-1 text-right text-sm font-semibold tracking-[-0.02em] text-ink/92 tabular-nums"
                    inputMode="decimal"
                    value={totalInputStr}
                    onChange={(e) => setTotalInputStr(e.target.value)}
                    onBlur={() =>
                      setTotalInputStr(formatTotalForInput(parseSaleTotalInput(totalInputStr, subtotal)))
                    }
                    aria-label="Sale total"
                    disabled={cart.length === 0}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <div className="text-xs font-medium text-ink/70">Discount</div>
              <div className="grid grid-cols-2 gap-2">
                {DISCOUNT_OPTIONS.map((opt) => (
                  <ChoiceChip
                    key={opt.id}
                    icon={<Percent className="h-4 w-4" />}
                    label={opt.label}
                    hint={opt.hint}
                    selected={discountPreset === opt.id}
                    onClick={() => setDiscountPreset(opt.id)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <div className="text-xs font-medium text-ink/70">Payment</div>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_OPTIONS.map((opt) => (
                  <ChoiceChip
                    key={opt.id}
                    icon={opt.icon}
                    label={opt.label}
                    hint={opt.hint}
                    selected={paymentMethod === opt.id}
                    onClick={() => {
                      setPaymentMethod(opt.id)
                      setCheckoutError(null)
                    }}
                  />
                ))}
              </div>
              {paymentMethod === 'credit' && !selectedCustomer ? (
                <div className="text-[11px] text-[color-mix(in_oklab,var(--highlight)_72%,white)]">
                  Select a customer for credit sales.
                </div>
              ) : null}
              {paymentMethod === 'credit' && selectedCustomer && creditCheckoutPreview ? (
                <div
                  className={clsx(
                    'mt-3 rounded-2xl border px-4 py-3',
                    creditCheckoutPreview.overLimit
                      ? 'border-[color-mix(in_oklab,var(--highlight)_35%,transparent)] bg-[color-mix(in_oklab,var(--highlight)_8%,transparent)]'
                      : 'border-white/10 bg-white/[0.02]',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold tracking-[-0.02em] text-ink/80">On-account sale</div>
                    <Link
                      to={`/credits/${selectedCustomer.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[color-mix(in_oklab,var(--accent)_78%,white)] transition hover:text-[color-mix(in_oklab,var(--accent)_92%,white)]"
                    >
                      Credit ledger
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-70" strokeWidth={1.75} />
                    </Link>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink/48">
                    This total is added to the customer&apos;s outstanding balance when you confirm.
                  </p>
                  <div className="mt-3 space-y-1.5 text-[11px] text-ink/60">
                    <div className="flex justify-between gap-3 tabular-nums">
                      <span className="text-ink/50">Current balance</span>
                      <span className="font-medium text-ink/85">{formatMoney(creditCheckoutPreview.currentDebt)}</span>
                    </div>
                    <div className="flex justify-between gap-3 tabular-nums">
                      <span className="text-ink/50">This sale</span>
                      <span className="font-medium text-ink/85">{formatMoney(parsedTotal)}</span>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-white/10 pt-1.5 tabular-nums">
                      <span className="text-ink/50">After sale</span>
                      <span
                        className={clsx(
                          'font-semibold',
                          creditCheckoutPreview.overLimit
                            ? 'text-[color-mix(in_oklab,var(--highlight)_78%,white)]'
                            : 'text-ink/90',
                        )}
                      >
                        {formatMoney(creditCheckoutPreview.after)}
                      </span>
                    </div>
                    {creditCheckoutPreview.limit != null && creditCheckoutPreview.limit > 0 ? (
                      <div className="flex justify-between gap-3 tabular-nums">
                        <span className="text-ink/50">Credit limit</span>
                        <span className="font-medium text-ink/85">{formatMoney(creditCheckoutPreview.limit)}</span>
                      </div>
                    ) : null}
                  </div>
                  {creditCheckoutPreview.overLimit ? (
                    <p className="mt-2 text-[11px] text-[color-mix(in_oklab,var(--highlight)_75%,white)]">
                      Reduce the total or choose another payment method — the server will reject this credit sale.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-2">
              <FieldLabel htmlFor="note">Note (optional)</FieldLabel>
              <TextField
                id="note"
                placeholder="Ex: partial payment, delivery, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="mt-5 grid gap-2">
              <Button
                type="button"
                className="h-11 w-full"
                disabled={cart.length === 0 || isSubmitting || Boolean(creditCheckoutPreview?.overLimit)}
                onClick={() => {
                  if (!canOpenConfirm()) return
                  setConfirmOpen(true)
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving sale…
                  </>
                ) : (
                  <>
                    <Banknote className="h-4 w-4" />
                    Validate sale
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full"
                onClick={() => searchRef.current?.focus()}
              >
                <Plus className="h-4 w-4" />
                Focus product search
              </Button>
            </div>
          </div>
        </section>
      </div>

      {confirmOpen ? (
        <ConfirmSaleModal
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false)
            void handleValidate()
          }}
          printAfterSave={printAfterSave}
          onTogglePrintAfterSave={setPrintAfterSave}
          customerName={selectedCustomer ? selectedCustomer.name : 'Walk-in'}
          paymentMethod={paymentMethod}
          subtotal={subtotal}
          discount={effectiveDiscount}
          total={parsedTotal}
          notes={notes}
          lines={cart.map((l) => ({
            productName: l.productName,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: Math.round(l.unitPrice * l.quantity * 100) / 100,
          }))}
        />
      ) : null}
    </AppShell>
  )
}

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-xs text-ink/55">{label}</div>
      <div
        className={
          strong ? 'text-sm font-semibold tracking-[-0.02em] text-ink/92' : 'text-xs font-medium text-ink/80'
        }
      >
        {value}
      </div>
    </div>
  )
}

function ChoiceChip({
  icon,
  label,
  hint,
  selected,
  onClick,
}: {
  icon: ReactNode
  label: string
  hint?: string
  selected?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-xs transition',
        selected
          ? 'border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-ink/90'
          : 'border-white/10 bg-white/[0.02] text-ink/70 hover:bg-white/[0.04]',
      )}
    >
      <span
        className={clsx(
          'grid h-8 w-8 shrink-0 place-items-center rounded-xl border text-ink/80',
          selected ? 'border-white/15 bg-white/[0.06]' : 'border-white/10 bg-white/[0.03]',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-[10px] text-ink/45">{hint}</span> : null}
      </span>
    </button>
  )
}

function ConfirmSaleModal({
  onClose,
  onConfirm,
  printAfterSave,
  onTogglePrintAfterSave,
  customerName,
  paymentMethod,
  subtotal,
  discount,
  total,
  notes,
  lines,
}: {
  onClose: () => void
  onConfirm: () => void
  printAfterSave: boolean
  onTogglePrintAfterSave: (next: boolean) => void
  customerName: string
  paymentMethod: PaymentMethod
  subtotal: number
  discount: number
  total: number
  notes: string
  lines: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[]
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/72 backdrop-blur-md"
        aria-label="Dismiss"
        onClick={onClose}
      />
      <div className="relative z-[1] w-full max-w-lg overflow-hidden rounded-3xl border border-white/12 bg-[color-mix(in_oklab,var(--bg-1)_96%,white)] shadow-[0_56px_140px_-56px_rgba(0,0,0,0.9)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(255,255,255,0.07),transparent)]" />

        <div className="relative border-b border-white/10 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink/50">
                Confirm
              </div>
              <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-ink/92">Validate sale</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink/55">
                Review totals and payment method. Printing will be added here later.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-ink/60 transition hover:bg-white/[0.07] hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="relative max-h-[min(70vh,520px)] overflow-y-auto px-6 py-5">
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
            <div className="flex justify-between gap-3 text-ink/65">
              <span>Customer</span>
              <span className="max-w-[60%] truncate font-medium text-ink/88">{customerName}</span>
            </div>
            <div className="flex justify-between gap-3 text-ink/65">
              <span>Payment</span>
              <span className="font-medium text-ink/88">
                {paymentMethod === 'credit'
                  ? 'Credit (on account)'
                  : paymentMethod === 'moncash'
                    ? 'MonCash'
                    : paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}
              </span>
            </div>
            {paymentMethod === 'credit' ? (
              <p className="text-[11px] leading-relaxed text-ink/48">
                The total is added to this customer&apos;s outstanding credit balance.
              </p>
            ) : null}
            <div className="my-1 border-t border-white/10" />
            <div className="flex justify-between gap-3 text-ink/65">
              <span>Subtotal</span>
              <span className="font-medium tabular-nums text-ink/88">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between gap-3 text-ink/65">
              <span>Discount</span>
              <span className="font-medium tabular-nums text-ink/88">{formatMoney(discount)}</span>
            </div>
            <div className="flex justify-between gap-3 font-medium text-ink/88">
              <span>Total</span>
              <span className="tabular-nums text-[color-mix(in_oklab,var(--accent)_82%,white)]">{formatMoney(total)}</span>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-xs font-medium text-ink/70">Items</div>
            <div className="mt-3 space-y-0 divide-y divide-white/[0.06]">
              {lines.map((ln, idx) => (
                <div key={`${ln.productName}-${idx}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium tracking-[-0.02em] text-ink/88">{ln.productName}</div>
                    <div className="mt-1 text-xs text-ink/48">
                      {ln.quantity} × {formatMoney(ln.unitPrice)}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold tabular-nums text-ink/90">{formatMoney(ln.lineTotal)}</div>
                </div>
              ))}
            </div>
          </div>

          {notes.trim() ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <div className="text-xs font-medium text-ink/70">Note</div>
              <div className="mt-1 text-sm text-ink/65">{notes.trim()}</div>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm font-medium tracking-[-0.02em] text-ink/80">Print receipt after save</span>
              <input
                type="checkbox"
                checked={printAfterSave}
                onChange={(e) => onTogglePrintAfterSave(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </label>
            <div className="mt-1 text-xs text-ink/48">
              Uses the browser print dialog (80mm receipt). You can disable if the printer is offline.
            </div>
          </div>
        </div>

        <div className="relative flex flex-col gap-2 border-t border-white/10 bg-white/[0.02] px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="sm:min-w-[100px]" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="sm:min-w-[170px]" onClick={onConfirm}>
            <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            Confirm & save
          </Button>
        </div>
      </div>
    </div>
  )
}
