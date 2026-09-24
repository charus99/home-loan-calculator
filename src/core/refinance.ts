import { buildSchedule } from './amortization'
import type { LoanTerms, RefinanceComparison, RefinanceCosts } from './types'

/**
 * Adds up the one-off costs of moving a loan.
 *
 * Missing entries count as zero: a borrower who has not been quoted a
 * valuation fee should see the comparison without it rather than be blocked.
 */
export function totalRefinanceCosts(costs: RefinanceCosts): number {
  return (
    (costs.mortgageRegistration ?? 0) +
    (costs.appraisal ?? 0) +
    (costs.stampDuty ?? 0) +
    (costs.insurance ?? 0) +
    (costs.prepaymentPenalty ?? 0) +
    (costs.other ?? 0)
  )
}

/**
 * The conventional mortgage registration fee: 1% of the facility.
 *
 * Offered as a starting figure for the form. The actual charge is set by the
 * Land Department and can differ, so the borrower can overwrite it.
 */
export function estimateMortgageRegistration(loanAmount: number): number {
  return loanAmount * 0.01
}

/**
 * Compares staying on the current loan against refinancing to a new one.
 *
 * Both schedules are compared over the same number of months, because a new
 * loan that merely stretches the term will show a lower instalment while
 * costing more interest overall. Using the longer of the two terms means that
 * extra interest appears in the comparison instead of being hidden by an
 * earlier cut-off.
 */
export function compareRefinance(
  currentLoan: LoanTerms,
  alternativeLoan: LoanTerms,
  costs: RefinanceCosts = {},
): RefinanceComparison {
  const current = buildSchedule(currentLoan)
  const alternative = buildSchedule(alternativeLoan)

  const totalCosts = totalRefinanceCosts(costs)
  const grossInterestSaved = current.totalInterest - alternative.totalInterest
  const netSaving = grossInterestSaved - totalCosts

  const horizon = Math.max(current.rows.length, alternative.rows.length)
  const cumulativeNet: number[] = []

  // The borrower is out of pocket by the costs on day one, and each month
  // recovers the interest the new loan did not charge.
  //
  // Interest rather than cash paid out: when both loans carry the same
  // instalment the monthly outlay is identical, so a cash measure stays flat
  // until the cheaper loan clears — reporting break-even in year sixteen for a
  // move that has recovered its costs within months. The interest not charged
  // goes to principal instead, which is money kept, from the first month.
  //
  // Measured this way the series ends exactly at netSaving, and a smaller
  // instalment that costs more interest overall can never read as paying off.
  let runningNet = -totalCosts
  let lastMonthBelowZero = 0

  for (let index = 0; index < horizon; index++) {
    // A cleared loan charges nothing further, so a schedule that has ended
    // contributes zero rather than dropping out of the comparison.
    const currentInterest = current.rows[index]?.interest ?? 0
    const alternativeInterest = alternative.rows[index]?.interest ?? 0

    runningNet += currentInterest - alternativeInterest
    cumulativeNet.push(runningNet)

    if (runningNet < 0) {
      lastMonthBelowZero = index + 1
    }
  }

  // The month from which the move stays paid for. A promotional rate can put
  // the running total ahead early and then drag it back below zero once the
  // rate steps up; the first crossing would promise a recovery that does not
  // hold.
  const breakEvenMonth =
    netSaving > 0 && lastMonthBelowZero < horizon ? lastMonthBelowZero + 1 : null

  return {
    current,
    alternative,
    totalCosts,
    grossInterestSaved,
    netSaving,
    breakEvenMonth,
    cumulativeNet,
    monthsSaved: current.monthsToPayoff - alternative.monthsToPayoff,
  }
}

/**
 * Compares paying extra each month against paying only the instalment.
 *
 * Modelled as a refinance with no costs and no change of lender, since the
 * question ("what does paying more get me") has the same shape.
 */
export function compareExtraPayment(
  loan: LoanTerms,
  extraMonthlyPayment: number,
): RefinanceComparison {
  return compareRefinance(loan, { ...loan, extraMonthlyPayment }, {})
}
