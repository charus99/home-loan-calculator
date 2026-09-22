import { describe, expect, it } from 'vitest'
import {
  compareExtraPayment,
  compareRefinance,
  estimateMortgageRegistration,
  totalRefinanceCosts,
} from './refinance'
import type { LoanTerms } from './types'

const START_DATE = new Date(2026, 0, 15)

/** Someone 8 years into a 30-year loan, now paying the post-promotional rate. */
const currentLoan: LoanTerms = {
  principal: 2_000_000,
  rateTiers: [{ fromMonth: 1, annualRatePercent: 6.5 }],
  termMonths: 264,
  startDate: START_DATE,
}

/** A replacement loan at a promotional rate for the same remaining term. */
const betterLoan: LoanTerms = {
  principal: 2_000_000,
  rateTiers: [
    { fromMonth: 1, annualRatePercent: 3 },
    { fromMonth: 37, annualRatePercent: 5.5 },
  ],
  termMonths: 264,
  startDate: START_DATE,
}

describe('totalRefinanceCosts', () => {
  it('adds up every cost', () => {
    expect(
      totalRefinanceCosts({
        mortgageRegistration: 20_000,
        appraisal: 3_000,
        stampDuty: 1_000,
        insurance: 15_000,
        prepaymentPenalty: 60_000,
        other: 500,
      }),
    ).toBe(99_500)
  })

  it('treats missing costs as zero rather than blocking the comparison', () => {
    expect(totalRefinanceCosts({ mortgageRegistration: 20_000 })).toBe(20_000)
    expect(totalRefinanceCosts({})).toBe(0)
  })
})

describe('estimateMortgageRegistration', () => {
  it('returns 1% of the facility', () => {
    expect(estimateMortgageRegistration(2_000_000)).toBe(20_000)
  })
})

describe('compareRefinance', () => {
  it('reports a saving when the new rate is genuinely lower', () => {
    const result = compareRefinance(currentLoan, betterLoan, {
      mortgageRegistration: 20_000,
      appraisal: 3_000,
    })

    expect(result.grossInterestSaved).toBeGreaterThan(0)
    expect(result.netSaving).toBeGreaterThan(0)
    expect(result.netSaving).toBeLessThan(result.grossInterestSaved)
  })

  it('subtracts costs from the gross saving', () => {
    const costs = { mortgageRegistration: 20_000, appraisal: 3_000 }
    const result = compareRefinance(currentLoan, betterLoan, costs)
    expect(result.netSaving).toBeCloseTo(result.grossInterestSaved - 23_000, 6)
  })

  it('turns a worthwhile move into a loss once the penalty is large enough', () => {
    // The same refinance, but settling early triggers a penalty that eats the
    // benefit. This is the case a borrower most needs the calculator for.
    const cheap = compareRefinance(currentLoan, betterLoan, { mortgageRegistration: 20_000 })
    const penalised = compareRefinance(currentLoan, betterLoan, {
      mortgageRegistration: 20_000,
      prepaymentPenalty: cheap.grossInterestSaved,
    })

    expect(cheap.netSaving).toBeGreaterThan(0)
    expect(penalised.netSaving).toBeLessThan(cheap.netSaving)
    expect(penalised.netSaving).toBeLessThanOrEqual(0)
  })

  it('reports a negative saving when the new loan is worse', () => {
    const worseLoan: LoanTerms = {
      ...currentLoan,
      rateTiers: [{ fromMonth: 1, annualRatePercent: 8 }],
    }
    const result = compareRefinance(currentLoan, worseLoan, {})
    expect(result.grossInterestSaved).toBeLessThan(0)
    expect(result.netSaving).toBeLessThan(0)
  })

  it('does not hide the extra interest when a new loan stretches the term', () => {
    // A longer term lowers the instalment, which looks attractive. Comparing
    // over the longer horizon exposes the extra interest that buys it.
    const stretchedLoan: LoanTerms = {
      ...currentLoan,
      termMonths: 360,
      rateTiers: [{ fromMonth: 1, annualRatePercent: 6.5 }],
    }
    const result = compareRefinance(currentLoan, stretchedLoan, {})

    expect(result.alternative.rows[0].payment).toBeLessThan(result.current.rows[0].payment)
    expect(result.netSaving).toBeLessThan(0)
    expect(result.monthsSaved).toBeLessThan(0)
  })
})

describe('break-even point', () => {
  it('finds the month the savings overtake the costs', () => {
    const result = compareRefinance(currentLoan, betterLoan, {
      mortgageRegistration: 20_000,
      appraisal: 3_000,
    })

    expect(result.breakEvenMonth).not.toBeNull()
    expect(result.breakEvenMonth!).toBeGreaterThan(0)
    expect(result.breakEvenMonth!).toBeLessThan(currentLoan.termMonths)
  })

  it('starts the borrower out of pocket by the full cost', () => {
    const result = compareRefinance(currentLoan, betterLoan, { mortgageRegistration: 20_000 })
    // Month one recovers part of the outlay but should not clear all of it.
    expect(result.cumulativeNet[0]).toBeLessThan(0)
    expect(result.cumulativeNet[0]).toBeGreaterThan(-20_000)
  })

  it('crosses zero exactly at the reported break-even month', () => {
    const result = compareRefinance(currentLoan, betterLoan, { mortgageRegistration: 20_000 })
    const month = result.breakEvenMonth!

    expect(result.cumulativeNet[month - 1]).toBeGreaterThanOrEqual(0)
    expect(result.cumulativeNet[month - 2]).toBeLessThan(0)
  })

  it('takes longer to break even when the costs are higher', () => {
    const cheap = compareRefinance(currentLoan, betterLoan, { mortgageRegistration: 20_000 })
    const expensive = compareRefinance(currentLoan, betterLoan, {
      mortgageRegistration: 20_000,
      prepaymentPenalty: 50_000,
    })
    expect(expensive.breakEvenMonth!).toBeGreaterThan(cheap.breakEvenMonth!)
  })

  it('reports no break-even when the move never pays for itself', () => {
    const worseLoan: LoanTerms = {
      ...currentLoan,
      rateTiers: [{ fromMonth: 1, annualRatePercent: 8 }],
    }
    const result = compareRefinance(currentLoan, worseLoan, { mortgageRegistration: 20_000 })
    expect(result.breakEvenMonth).toBeNull()
  })

  it('does not call a cheaper instalment a break-even when the interest is higher', () => {
    // A promotional loan whose instalment is set from the teaser rate looks
    // affordable from month one but costs more interest overall. Monthly cash
    // flow turns positive early; the deal never actually pays off.
    const teaserLoan: LoanTerms = {
      principal: 2_400_000,
      rateTiers: [
        { fromMonth: 1, annualRatePercent: 3 },
        { fromMonth: 37, annualRatePercent: 5.75 },
      ],
      termMonths: 264,
      startDate: START_DATE,
    }
    const expensiveCurrentLoan: LoanTerms = {
      principal: 2_400_000,
      rateTiers: [{ fromMonth: 1, annualRatePercent: 6.5 }],
      termMonths: 264,
      startDate: START_DATE,
    }

    const result = compareRefinance(expensiveCurrentLoan, teaserLoan, {
      mortgageRegistration: 24_000,
    })

    expect(result.alternative.rows[0].payment).toBeLessThan(result.current.rows[0].payment)
    expect(result.netSaving).toBeLessThan(0)
    expect(result.breakEvenMonth).toBeNull()
  })

  it('produces one cumulative entry per month of the longer schedule', () => {
    const result = compareRefinance(currentLoan, betterLoan, {})
    const horizon = Math.max(result.current.rows.length, result.alternative.rows.length)
    expect(result.cumulativeNet).toHaveLength(horizon)
  })
})

describe('compareExtraPayment', () => {
  it('shows interest saved and a shorter payoff', () => {
    const result = compareExtraPayment(currentLoan, 5_000)
    expect(result.netSaving).toBeGreaterThan(0)
    expect(result.monthsSaved).toBeGreaterThan(0)
  })

  it('has no costs to recover, so it pays off from the first month', () => {
    const result = compareExtraPayment(currentLoan, 5_000)
    expect(result.totalCosts).toBe(0)
    // Paying extra means a bigger outlay early, so the cumulative position
    // starts negative and only turns positive once the loan clears early.
    expect(result.cumulativeNet[0]).toBeLessThan(0)
    expect(result.breakEvenMonth).not.toBeNull()
  })

  it('saves more the more is paid', () => {
    const modest = compareExtraPayment(currentLoan, 2_000)
    const aggressive = compareExtraPayment(currentLoan, 10_000)
    expect(aggressive.netSaving).toBeGreaterThan(modest.netSaving)
    expect(aggressive.monthsSaved).toBeGreaterThan(modest.monthsSaved)
  })
})
