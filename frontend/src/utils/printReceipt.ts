import type { SaleResponse } from '../api/sales'
import { loadWorkspaceBranding } from '../branding/workspaceBranding'
import { moneyFromApi } from '../types/product'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatMoney(n: number) {
  return `HTG ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function fmt(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function printSaleReceipt(sale: SaleResponse) {
  const { posName, logoDataUrl } = loadWorkspaceBranding()
  const safeLogoSrc = logoDataUrl ? logoDataUrl.replace(/"/g, '&quot;') : ''
  const subtotal = moneyFromApi(sale.subtotal)
  const discount = moneyFromApi(sale.discount)
  const total = moneyFromApi(sale.total)
  const customer = sale.customer ? `${sale.customer.name}${sale.customer.phone ? ` · ${sale.customer.phone}` : ''}` : 'Walk-in'

  const lines = sale.items
    .map((it) => {
      const unit = moneyFromApi(it.unit_price)
      const lineSub = moneyFromApi(it.line_subtotal)
      return `
        <div class="row line">
          <div class="left">
            <div class="name">${escapeHtml(it.product_name)}</div>
            <div class="meta">${it.quantity} × ${escapeHtml(formatMoney(unit))}</div>
          </div>
          <div class="right">${escapeHtml(formatMoney(lineSub))}</div>
        </div>
      `
    })
    .join('')

  const note = sale.notes?.trim() ? `<div class="note"><div class="label">Note</div><div>${escapeHtml(sale.notes.trim())}</div></div>` : ''

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Receipt #${sale.id}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      .page { padding: 10px 10px 12px; }
      .brandlogo { text-align: center; margin-bottom: 4px; }
      .brandlogo img { max-height: 36px; max-width: 160px; object-fit: contain; }
      .brand { font-weight: 800; letter-spacing: -0.02em; font-size: 14px; text-align: center; }
      .muted { color: #444; font-size: 11px; }
      .hr { border-top: 1px dashed #777; margin: 8px 0; }
      .row { display: flex; justify-content: space-between; gap: 10px; }
      .row .right { text-align: right; white-space: nowrap; }
      .k { font-size: 11px; color: #333; }
      .v { font-size: 11px; color: #111; font-weight: 600; }
      .line { padding: 6px 0; }
      .name { font-size: 11px; font-weight: 700; color: #111; }
      .meta { font-size: 10px; color: #444; margin-top: 2px; }
      .totals { margin-top: 6px; }
      .total { font-size: 13px; font-weight: 900; }
      .note { margin-top: 8px; font-size: 10px; }
      .note .label { font-weight: 800; margin-bottom: 2px; }
      .footer { margin-top: 10px; font-size: 10px; color: #444; text-align: center; }

      @page { size: 80mm auto; margin: 0; }
      @media print {
        html, body { width: 80mm; }
        .page { width: 80mm; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      ${logoDataUrl ? `<div class="brandlogo"><img src="${safeLogoSrc}" alt="" /></div>` : ''}
      <div class="brand">${escapeHtml(posName)}</div>
      <div class="muted">Receipt #${sale.id} · ${escapeHtml(fmt(sale.created_at))}</div>
      <div class="muted">Payment: ${escapeHtml(sale.payment_method)}</div>
      <div class="muted">Customer: ${escapeHtml(customer)}</div>

      <div class="hr"></div>
      ${lines}
      <div class="hr"></div>

      <div class="totals">
        <div class="row"><div class="k">Subtotal</div><div class="v">${escapeHtml(formatMoney(subtotal))}</div></div>
        <div class="row"><div class="k">Discount</div><div class="v">-${escapeHtml(formatMoney(discount))}</div></div>
        <div class="row"><div class="k total">TOTAL</div><div class="v total">${escapeHtml(formatMoney(total))}</div></div>
      </div>

      ${note}
      <div class="footer">Thank you.</div>
    </div>
    <script>
      window.addEventListener('load', () => {
        setTimeout(() => window.print(), 50);
      });
    </script>
  </body>
</html>`

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.setAttribute('aria-hidden', 'true')
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    throw new Error('Printing is not available in this environment.')
  }
  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => {
    try {
      document.body.removeChild(iframe)
    } catch {
      /* ignore */
    }
  }
  iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true })
  // Fallback cleanup (some browsers don't fire afterprint reliably).
  window.setTimeout(cleanup, 15_000)
}

