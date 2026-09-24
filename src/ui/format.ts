/**
 * Formatting helpers for displaying money and rates in Thai.
 *
 * Rounding happens here, at the edge: the calculation core keeps full
 * precision so that errors do not compound across hundreds of rows.
 */

const bahtFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  maximumFractionDigits: 0,
})

const preciseBahtFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formats an amount as whole baht, for headline figures. */
export function formatBaht(amount: number): string {
  return bahtFormatter.format(amount)
}

/**
 * Rounds to the satang, for amounts that go into an input the visitor edits.
 *
 * Only for values on their way to a form field — the calculation core keeps
 * full precision so that rounding does not compound across hundreds of rows.
 */
export function roundToSatang(amount: number): number {
  return Math.round(amount * 100) / 100
}

/** Formats an amount to the satang, for schedule rows that should reconcile. */
export function formatBahtPrecise(amount: number): string {
  return preciseBahtFormatter.format(amount)
}

// th-TH defaults to the Buddhist calendar, matching the year on a Thai bank
// statement: 24 October 2026 reads "24 ต.ค. 69".
const thaiDateFormatter = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: '2-digit',
})

/** Formats a due date the way a Thai statement prints it, e.g. "24 ต.ค. 69". */
export function formatThaiDate(date: Date): string {
  return thaiDateFormatter.format(date)
}

/** Formats an annual rate, e.g. 6.5 becomes "6.50%". */
export function formatRate(annualRatePercent: number): string {
  return `${annualRatePercent.toFixed(2)}%`
}

/**
 * Formats a month count the way a borrower thinks about it: "22 ปี 6 เดือน"
 * rather than "270 เดือน".
 */
export function formatDuration(months: number): string {
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years === 0) {
    return `${remainingMonths} เดือน`
  }
  if (remainingMonths === 0) {
    return `${years} ปี`
  }
  return `${years} ปี ${remainingMonths} เดือน`
}
