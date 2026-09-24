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
  /**
   * How many monthly payments the schedule may run for.
   *
   * With monthlyPayment set this acts as a ceiling rather than a target: the
   * loan usually clears earlier, and monthsToPayoff reports when. A loan that
   * has not cleared by this month is still cut off here, with the final row's
   * balance left above zero.
   */
  termMonths: number
  /**
   * Due date of the next instalment — the first row of this schedule.
   *
   * The balance entered is what is owed after the last payment, so the first
   * period runs from one month before this date up to it. Every later
   * instalment falls on the same day of the month, rolling back to the last
   * day of shorter months. Takes precedence over startDate.
   */
  firstPaymentDate?: Date
  /**
   * Date the schedule starts from, with the first instalment one month later.
   * Used when firstPaymentDate is absent. Defaults to today, which makes the
   * figures shift from day to day, so callers showing results to a person
   * should pass firstPaymentDate instead.
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
  /** The date this instalment falls due. */
  date: Date
  /** Annual rate applied to this month, as a percentage. */
  annualRatePercent: number
  /** Days used to accrue interest for this month. */
  days: number
  /** Total cash paid this month, including any extra payment. */
  payment: number
  /** Portion of the payment consumed by interest. */
  interest: number
  /** Portion of the payment that reduced the principal, extra payment included. */
  principal: number
  /** How much of this month's payment was the extra payment on top of the instalment. */
  extraPaid: number
  /** Principal still owed after this month's payment. */
  balance: number
}

/**
 * One-off costs paid to move a loan to another lender.
 *
 * Every field is in baht and optional, because which costs apply depends on the
 * lender and on how far into the current contract the borrower is. Omitted
 * fields count as zero rather than as unknown.
 */
export interface RefinanceCosts {
  /** Mortgage registration at the Land Department, conventionally about 1% of the new facility. */
  mortgageRegistration?: number
  /** Lender's valuation of the property. */
  appraisal?: number
  /** Stamp duty on the loan agreement. */
  stampDuty?: number
  /** Fire insurance and/or mortgage reducing term assurance premiums. */
  insurance?: number
  /** Penalty the current lender charges for settling early, often within the first three years. */
  prepaymentPenalty?: number
  /** Anything else the borrower has been quoted. */
  other?: number
}

/** The outcome of comparing a refinance against staying put. */
export interface RefinanceComparison {
  /** Schedule for the remainder of the existing loan. */
  current: Schedule
  /** Schedule for the replacement loan. */
  alternative: Schedule
  /** Total of every cost in RefinanceCosts. */
  totalCosts: number
  /** Interest saved before costs. Negative means the new loan costs more interest. */
  grossInterestSaved: number
  /** Interest saved after costs. This is the figure that answers "is it worth it". */
  netSaving: number
  /**
   * The month from which the interest saved so far covers the up-front costs
   * for good, or null when the move never pays for itself.
   */
  breakEvenMonth: number | null
  /**
   * Interest saved to date minus the up-front costs, month by month, for the
   * break-even chart. Starts at minus the costs and ends at netSaving.
   */
  cumulativeNet: number[]
  /** Months cut from the payoff date. Negative means the new loan runs longer. */
  monthsSaved: number
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
