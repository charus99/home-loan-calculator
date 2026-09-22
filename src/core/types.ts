/**
 * Domain types for Thai home loan calculations.
 *
 * All money values are in baht as plain numbers. See docs/TECH-STACK.md for why
 * this project accepts floating point drift instead of a decimal library.
 */

/**
 * One tier of a stepped interest rate.
 *
 * Thai lenders advertise rates in year ranges ("years 1-3 at 3.00%, year 4
 * onward at 6.50%"), so a schedule is a list of tiers rather than a single rate.
 */
export interface RateTier {
  /** First month this tier applies to, 1-based and counted from the contract date. */
  fromMonth: number
  /** Annual nominal rate as a percentage, e.g. 3.25 for 3.25%. */
  annualRatePercent: number
}

/** Everything needed to generate an amortization schedule. */
export interface LoanTerms {
  /** Outstanding principal at the start of the schedule. */
  principal: number
  /** Rate tiers, ordered by fromMonth ascending. The first must start at month 1. */
  rateTiers: RateTier[]
  /** Total number of monthly payments. */
  termMonths: number
  /**
   * Date the schedule starts from, used to count the real days in each month.
   * Defaults to today when omitted, which is fine for comparing options but
   * means the figures shift from day to day.
   */
  startDate?: Date
  /**
   * Fixed monthly instalment. When omitted the schedule computes the payment
   * that retires the loan over termMonths at the first tier's rate — which is
   * how Thai lenders set the instalment for a stepped-rate loan.
   */
  monthlyPayment?: number
  /** Extra principal paid every month on top of the instalment. */
  extraMonthlyPayment?: number
}

/** One row of the amortization schedule. */
export interface ScheduleRow {
  /** 1-based month number. */
  month: number
  /** Annual rate applied to this month, as a percentage. */
  annualRatePercent: number
  /** Days used to accrue interest for this month. */
  days: number
  /** Total cash paid this month, including any extra payment. */
  payment: number
  /** Portion of the payment consumed by interest. */
  interest: number
  /** Portion of the payment that reduced the principal. */
  principal: number
  /** Principal still owed after this month's payment. */
  balance: number
}

/** A complete amortization schedule plus its headline totals. */
export interface Schedule {
  rows: ScheduleRow[]
  /** Sum of all interest paid. */
  totalInterest: number
  /** Sum of all cash paid, principal and interest together. */
  totalPaid: number
  /** Number of months until the balance reaches zero. */
  monthsToPayoff: number
  /**
   * True when a monthly payment did not cover that month's interest, so the
   * balance grew instead of shrinking. Callers must surface this rather than
   * presenting the totals as a normal result.
   */
  hasNegativeAmortization: boolean
}
