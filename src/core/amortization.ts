import {
  accrueInterest,
  annuityPayment,
  daysBetween,
  paymentDate,
  rateForMonth,
} from './interest'
import type { LoanTerms, Schedule, ScheduleRow } from './types'

/**
 * Balance below which the loan is treated as settled.
 *
 * Floating point arithmetic leaves fractions of a satang behind after hundreds
 * of payments; without this the final balance may never compare equal to zero.
 */
const SETTLED_THRESHOLD = 0.005

/**
 * Builds the month-by-month amortization schedule for a loan.
 *
 * The instalment stays fixed while the rate steps up, so a loan can still owe
 * money after its nominal term. The schedule stops at termMonths regardless,
 * and the caller can tell the loan did not clear because the final row's
 * balance is above zero.
 */
export function buildSchedule(terms: LoanTerms): Schedule {
  const { principal, rateTiers, termMonths } = terms
  const extra = terms.extraMonthlyPayment ?? 0

  if (principal <= 0) {
    throw new Error('Principal must be greater than zero')
  }
  if (termMonths <= 0) {
    throw new Error('Term must be at least one month')
  }

  // Thai lenders set the instalment from the first tier's rate, so a
  // promotional rate produces a payment that will not clear the loan once the
  // rate steps up. Reproducing that is the point, not a bug.
  const basePayment =
    terms.monthlyPayment ??
    annuityPayment(principal, rateForMonth(rateTiers, 1), termMonths)

  // Every due date is measured from one anchor so the day of the month never
  // drifts: a loan billed on the 31st returns to the 31st after February's
  // clamp to the 28th. With a first payment date the anchor is that date
  // itself; otherwise it is the start date, one month before the first.
  const anchor = terms.firstPaymentDate ?? terms.startDate ?? new Date()
  const firstOffset = terms.firstPaymentDate ? 0 : 1
  const dueDate = (month: number) => paymentDate(anchor, month - 1 + firstOffset)

  const rows: ScheduleRow[] = []
  let balance = principal
  let totalInterest = 0
  let totalPaid = 0
  let hasNegativeAmortization = false
  let monthsToPayoff = termMonths

  for (let month = 1; month <= termMonths; month++) {
    const annualRatePercent = rateForMonth(rateTiers, month)
    const date = dueDate(month)
    const days = daysBetween(dueDate(month - 1), date)
    const interest = accrueInterest(balance, annualRatePercent, days)

    const scheduled = basePayment + extra
    const payoffAmount = balance + interest
    const isFinalMonth = month === termMonths

    // The instalment comes from a rate/12 annuity while interest accrues on
    // real days, so a small residue survives the final scheduled payment.
    // Lenders settle this by collecting the remainder in the last instalment,
    // which is what the final month does here. Earlier months never pay more
    // than what is owed, so an overpaid loan simply finishes early.
    const payment = isFinalMonth ? payoffAmount : Math.min(scheduled, payoffAmount)

    const principalPaid = payment - interest
    if (principalPaid < 0) {
      hasNegativeAmortization = true
    }

    balance = balance - principalPaid
    totalInterest += interest
    totalPaid += payment

    const settled = balance <= SETTLED_THRESHOLD
    if (settled) {
      balance = 0
    }

    rows.push({
      month,
      date,
      annualRatePercent,
      days,
      payment,
      interest,
      principal: principalPaid,
      // The instalment is paid first; only what the payment exceeds it by is
      // the extra. A final payment smaller than the instalment carries none.
      extraPaid: Math.min(extra, Math.max(0, payment - basePayment)),
      balance,
    })

    if (settled) {
      monthsToPayoff = month
      break
    }
  }

  return {
    rows,
    totalInterest,
    totalPaid,
    monthsToPayoff,
    hasNegativeAmortization,
  }
}

/**
 * The balance still owed after a given number of months.
 *
 * Used to work out the payoff figure when comparing a refinance part way
 * through an existing loan.
 */
export function balanceAfterMonths(terms: LoanTerms, months: number): number {
  if (months <= 0) {
    return terms.principal
  }

  const schedule = buildSchedule(terms)
  const row = schedule.rows[Math.min(months, schedule.rows.length) - 1]
  return row ? row.balance : 0
}
