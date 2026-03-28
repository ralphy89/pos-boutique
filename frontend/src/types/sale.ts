export type PaymentMethod = 'cash' | 'moncash' | 'transfer' | 'credit'

export type SaleLineCreate = {
  product_id: number
  quantity: number
}

/** Matches backend `SaleCreate` JSON. */
export type SaleCreatePayload = {
  customer_id: number | null
  payment_method: PaymentMethod
  discount: number | null
  items: SaleLineCreate[]
  notes: string
}
