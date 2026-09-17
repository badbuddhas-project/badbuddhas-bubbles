/**
 * Shared GetCourse deal parsing for everything that decides app access from GC data
 * (/api/getcourse/check-subscription and the reconcile cron). Kept in one place so both
 * paths agree on what counts as a payment for the app.
 */

export const GC_BASE_URL = 'https://online.badbuddhas.ru/pl/api/account'

/** One paid app period. */
export const PERIOD_MS = 30 * 24 * 60 * 60 * 1000
/**
 * Slack added on top of a period when access is derived from a payment date. GC renews
 * on its own clock, often later in the day or a day or two after the 30-day mark, so an
 * expiry of exactly payment + 30d lapses before the renewal lands and locks the user out.
 *
 * Measured on 245 real renewals (Apr–Sep 2026, charges 20–45 days apart): 194 landed on
 * day 29–30 and the rest of the on-schedule ones by day 33. Lapsing before the next charge:
 * +0d 44%, +1d 10%, +3d 6.5%. What remains past day 33 is delayed charging (card retries),
 * which the reconcile cron picks up once the payment actually lands.
 */
export const RENEWAL_GRACE_MS = 3 * 24 * 60 * 60 * 1000

// Matches the app-subscription product in a GC deal's "Состав заказа" column.
export const APP_PRODUCT_RE = /bubbles?\s*black|приложени|чёрный\s*баблс|черный\s*баблс|баблс/i
// Matches the free trial product ("Черный баблс | trial | 14 дней в приложении"), which
// also matches APP_PRODUCT_RE and must never count as a payment.
export const TRIAL_PRODUCT_RE = /trial|триал|пробн/i

/** Find a column index by trying several header-name candidates. */
export function findCol(fields: string[], candidates: RegExp[]): number {
  for (const re of candidates) {
    const idx = fields.findIndex((f) => re.test(f))
    if (idx >= 0) return idx
  }
  return -1
}

export function parseDate(raw: unknown): number | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  // GC dates look like "2026-08-27 15:54:00"; treat as Moscow time (UTC+3) if no tz.
  const iso = /\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s) && !/[zZ+]/.test(s)
    ? s.replace(' ', 'T') + '+03:00'
    : s
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : t
}

function parseAmount(raw: unknown): number {
  const n = parseFloat(String(raw ?? '').replace(/\s/g, '').replace(',', '.'))
  return Number.isNaN(n) ? 0 : n
}

export type DealColumns = {
  email: number
  paidAt: number
  product: number
  dealId: number
  /** "Оплачено" — money actually received. -1 if the export has no such column. */
  paidAmount: number
}

/** Map a GC deals-export header to the columns we use; null if a required one is missing. */
export function mapDealColumns(fields: string[]): DealColumns | null {
  const cols: DealColumns = {
    email: findCol(fields, [/^email$/i, /e-?mail/i]),
    paidAt: findCol(fields, [/дата\s*оплат/i, /дата\s*заверш/i, /date_payment$/i, /payed|paid/i]),
    product: findCol(fields, [/состав\s*заказ/i, /предложени/i, /продукт/i, /состав/i, /offer|product/i]),
    dealId: findCol(fields, [/id\s*заказа/i, /^id$/i, /deal/i, /номер/i]),
    paidAmount: findCol(fields, [/^оплачено$/i]),
  }
  return cols.email < 0 || cols.paidAt < 0 || cols.product < 0 ? null : cols
}

/**
 * Is this deal row a real payment for the app?
 *
 * GC marks FREE deals "payed" once completed (webinar sign-ups, tests, waitlists, the
 * trial offer), so status=payed alone is not proof of payment. Require the app product,
 * not the trial, a payment date, and — when the export has the column — money received.
 */
export function isAppPayment(row: unknown[], cols: DealColumns): boolean {
  const product = String(row[cols.product] ?? '')
  if (TRIAL_PRODUCT_RE.test(product) || !APP_PRODUCT_RE.test(product)) return false
  if (parseDate(row[cols.paidAt]) == null) return false
  if (cols.paidAmount >= 0 && parseAmount(row[cols.paidAmount]) <= 0) return false
  return true
}

export type AppPayment = { ts: number; dealId: string | null }

/** Latest real app payment per lower-cased email. */
export function latestAppPayments(items: unknown[][], cols: DealColumns): Map<string, AppPayment> {
  const latest = new Map<string, AppPayment>()
  for (const row of items) {
    if (!isAppPayment(row, cols)) continue
    const email = String(row[cols.email] ?? '').toLowerCase().trim()
    if (!email) continue
    const ts = parseDate(row[cols.paidAt])!
    const prev = latest.get(email)
    if (!prev || ts > prev.ts) {
      latest.set(email, { ts, dealId: cols.dealId >= 0 && row[cols.dealId] != null ? String(row[cols.dealId]) : null })
    }
  }
  return latest
}

/** Access a payment buys: one period plus renewal grace, counted from the payment. */
export function accessEndsAt(paymentTs: number): number {
  return paymentTs + PERIOD_MS + RENEWAL_GRACE_MS
}
