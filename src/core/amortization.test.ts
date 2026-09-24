import { describe, expect, it } from 'vitest'
import { balanceAfterMonths, buildSchedule } from './amortization'
import type { LoanTerms } from './types'

/**
 * A fixed start date keeps results reproducible. Interest accrues on real
 * calendar days, so without this the totals would shift with the run date.
 */
const START_DATE = new Date(2026, 0, 15)

/** A plain 30-year loan at a single rate, used as the baseline in most tests. */
const flatLoan: LoanTerms = {
  principal: 2_400_000,
  rateTiers: [{ fromMonth: 1, annualRatePercent: 6.5 }],
  termMonths: 360,
  startDate: START_DATE,
}

/** A promotional loan: 3% for three years, then 6.5%. */
const steppedLoan: LoanTerms = {
  principal: 2_400_000,
  rateTiers: [
    { fromMonth: 1, annualRatePercent: 3 },
    { fromMonth: 37, annualRatePercent: 6.5 },
  ],
  termMonths: 360,
  startDate: START_DATE,
}

describe('buildSchedule', () => {
  it('produces one row per month for a loan that runs its full term', () => {
    const schedule = buildSchedule(flatLoan)
    expect(schedule.rows).toHaveLength(360)
    expect(schedule.rows[0].month).toBe(1)
    expect(schedule.rows[359].month).toBe(360)
  })

  it('reduces the balance every month once the payment covers the interest', () => {
    const { rows } = buildSchedule(flatLoan)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].balance).toBeLessThan(rows[i - 1].balance)
    }
  })

  it('shifts from mostly interest to mostly principal over the term', () => {
    const { rows } = buildSchedule(flatLoan)
    expect(rows[0].interest).toBeGreaterThan(rows[0].principal)
    const last = rows[rows.length - 1]
    expect(last.principal).toBeGreaterThan(last.interest)
  })

  it('applies the stepped rate on the month the tier changes', () => {
    const { rows } = buildSchedule(steppedLoan)
    expect(rows[35].annualRatePercent).toBe(3)
    expect(rows[36].annualRatePercent).toBe(6.5)
    // The instalment is fixed, so a higher rate means less principal retired.
    expect(rows[36].principal).toBeLessThan(rows[35].principal)
  })

  it('accounts for every baht: principal repaid equals the amount borrowed', () => {
    // Guards against accumulated floating point drift, which docs/TECH-STACK.md
    // accepts only as long as it stays this small over hundreds of rows.
    const schedule = buildSchedule(flatLoan)
    const principalRepaid = schedule.rows.reduce((sum, row) => sum + row.principal, 0)
    expect(principalRepaid).toBeCloseTo(flatLoan.principal, 2)
  })

  it('reports totals that agree with the rows', () => {
    const schedule = buildSchedule(flatLoan)
    const interestFromRows = schedule.rows.reduce((sum, row) => sum + row.interest, 0)
    const paidFromRows = schedule.rows.reduce((sum, row) => sum + row.payment, 0)
    expect(schedule.totalInterest).toBeCloseTo(interestFromRows, 6)
    expect(schedule.totalPaid).toBeCloseTo(paidFromRows, 6)
  })

  it('clears the balance exactly on the final payment', () => {
    const schedule = buildSchedule(flatLoan)
    expect(schedule.rows[schedule.rows.length - 1].balance).toBe(0)
  })

  it('collects the leftover residue in the final instalment', () => {
    // A rate/12 instalment against real-day interest leaves a small residue,
    // which the last payment settles the way a lender would. It should be a
    // rounding-scale difference, not a surprise balloon payment.
    const rows = buildSchedule(flatLoan).rows
    const last = rows[rows.length - 1]
    const secondToLast = rows[rows.length - 2]
    expect(last.payment).toBeGreaterThan(secondToLast.payment)
    expect(last.payment).toBeLessThan(secondToLast.payment * 1.5)
  })

  it('never charges more than is owed in any earlier month', () => {
    const rows = buildSchedule(flatLoan).rows
    for (const row of rows.slice(0, -1)) {
      expect(row.payment).toBeLessThanOrEqual(rows[0].payment + 0.01)
    }
  })
})

describe('first payment date', () => {
  const loan: LoanTerms = {
    principal: 3_351_338.19,
    rateTiers: [{ fromMonth: 1, annualRatePercent: 2.89 }],
    termMonths: 480,
    monthlyPayment: 14_800,
    extraMonthlyPayment: 5_200,
    firstPaymentDate: new Date(2026, 9, 24),
  }

  it('puts the first row on the date given', () => {
    const { rows } = buildSchedule(loan)
    expect(rows[0].date).toEqual(new Date(2026, 9, 24))
    expect(rows[1].date).toEqual(new Date(2026, 10, 24))
  })

  it('accrues the first period from one month before that date', () => {
    // 24 Sep → 24 Oct is 30 days.
    const { rows } = buildSchedule(loan)
    expect(rows[0].days).toBe(30)
    expect(rows[0].interest).toBeCloseTo((3_351_338.19 * 0.0289 * 30) / 365, 6)
  })

  it('gives the same figures whatever day it is run', () => {
    // Without a fixed date the schedule anchored on today and shifted daily.
    const first = buildSchedule(loan)
    const second = buildSchedule({ ...loan })
    expect(second.totalInterest).toBe(first.totalInterest)
  })

  it('keeps a loan billed on the 31st on the 31st after February', () => {
    const { rows } = buildSchedule({ ...loan, firstPaymentDate: new Date(2027, 0, 31) })
    expect(rows[1].date).toEqual(new Date(2027, 1, 28))
    expect(rows[2].date).toEqual(new Date(2027, 2, 31))
    expect(rows[2].days).toBe(31)
  })
})

describe('extra payment recorded per row', () => {
  it('separates the extra from the instalment', () => {
    const { rows } = buildSchedule({ ...flatLoan, monthlyPayment: 17_100, extraMonthlyPayment: 5_000 })
    expect(rows[0].payment).toBeCloseTo(22_100, 6)
    expect(rows[0].extraPaid).toBeCloseTo(5_000, 6)
  })

  it('records none when there is no extra payment', () => {
    const { rows } = buildSchedule(flatLoan)
    expect(rows.every((row) => row.extraPaid === 0)).toBe(true)
  })

  it('counts only what a short final payment exceeds the instalment by as extra', () => {
    const { rows } = buildSchedule({ ...flatLoan, extraMonthlyPayment: 500_000 })
    const instalment = rows[0].payment - 500_000
    const last = rows[rows.length - 1]

    // The last payment clears a small remainder, well short of instalment
    // plus extra, so it must not be reported as carrying the full 500,000.
    expect(last.payment).toBeLessThan(instalment + 500_000)
    expect(last.extraPaid).toBeCloseTo(Math.max(0, last.payment - instalment), 6)
  })
})

describe('extra payments', () => {
  it('clears the loan early', () => {
    const withExtra = buildSchedule({ ...flatLoan, extraMonthlyPayment: 5_000 })
    expect(withExtra.monthsToPayoff).toBeLessThan(360)
    expect(withExtra.rows[withExtra.rows.length - 1].balance).toBe(0)
  })

  it('saves interest compared with paying the instalment alone', () => {
    const plain = buildSchedule(flatLoan)
    const withExtra = buildSchedule({ ...flatLoan, extraMonthlyPayment: 5_000 })
    expect(withExtra.totalInterest).toBeLessThan(plain.totalInterest)
  })

  it('shows the effect in the very next month, not only at the end', () => {
    // Daily rest means a bigger payment cuts the following month's interest.
    const plain = buildSchedule(flatLoan)
    const withExtra = buildSchedule({ ...flatLoan, extraMonthlyPayment: 5_000 })
    expect(withExtra.rows[1].interest).toBeLessThan(plain.rows[1].interest)
  })

  it('handles an extra payment large enough to clear the loan in months', () => {
    const schedule = buildSchedule({ ...flatLoan, extraMonthlyPayment: 500_000 })
    expect(schedule.monthsToPayoff).toBeLessThan(12)
    expect(schedule.rows[schedule.rows.length - 1].balance).toBe(0)
  })
})

describe('negative amortization', () => {
  it('flags a payment too small to cover the interest', () => {
    // 1,000 a month against 6.5% on 2.4M accrues far more interest than that.
    const schedule = buildSchedule({ ...flatLoan, monthlyPayment: 1_000 })
    expect(schedule.hasNegativeAmortization).toBe(true)
  })

  it('shows the balance growing rather than silently reporting a result', () => {
    const schedule = buildSchedule({ ...flatLoan, monthlyPayment: 1_000 })
    expect(schedule.rows[1].balance).toBeGreaterThan(schedule.rows[0].balance)
  })

  it('does not flag a healthy loan', () => {
    expect(buildSchedule(flatLoan).hasNegativeAmortization).toBe(false)
  })
})

describe('input validation', () => {
  it('rejects a non-positive principal', () => {
    expect(() => buildSchedule({ ...flatLoan, principal: 0 })).toThrow(/greater than zero/)
  })

  it('rejects a non-positive term', () => {
    expect(() => buildSchedule({ ...flatLoan, termMonths: 0 })).toThrow(/at least one month/)
  })
})

describe('balanceAfterMonths', () => {
  it('returns the full principal before any payment', () => {
    expect(balanceAfterMonths(flatLoan, 0)).toBe(flatLoan.principal)
  })

  it('returns less than the principal once payments have been made', () => {
    const after36 = balanceAfterMonths(flatLoan, 36)
    expect(after36).toBeLessThan(flatLoan.principal)
    expect(after36).toBeGreaterThan(0)
  })

  it('agrees with the schedule row for the same month', () => {
    const schedule = buildSchedule(flatLoan)
    expect(balanceAfterMonths(flatLoan, 36)).toBeCloseTo(schedule.rows[35].balance, 6)
  })

  it('leaves less owing under a promotional rate during the promotional years', () => {
    // The promotional instalment is smaller, but at 3% so little of it goes to
    // interest that more principal is retired than under a 6.5% loan. This is
    // what makes the first three years of a Thai promotional loan worth having,
    // and why the comparison has to run past the step-up to be honest.
    expect(balanceAfterMonths(steppedLoan, 36)).toBeLessThan(
      balanceAfterMonths(flatLoan, 36),
    )
  })

  it('loses that advantage after the rate steps up', () => {
    // Once the rate rises the fixed instalment retires far less principal, so
    // the gap closes. Tested at the point where the flat loan overtakes.
    const steppedSchedule = buildSchedule(steppedLoan)
    const flatSchedule = buildSchedule(flatLoan)
    const steppedPrincipalAfterStep = steppedSchedule.rows[36].principal
    const flatPrincipalSameMonth = flatSchedule.rows[36].principal
    expect(steppedPrincipalAfterStep).toBeLessThan(flatPrincipalSameMonth)
  })
})
