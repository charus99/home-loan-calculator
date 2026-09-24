import { describe, expect, it } from 'vitest'
import {
  accrueInterest,
  annuityPayment,
  DAYS_PER_YEAR,
  daysBetween,
  paymentDate,
  rateForMonth,
  validateRateTiers,
} from './interest'
import type { RateTier } from './types'

describe('accrueInterest', () => {
  it('charges a full year of interest over 365 days', () => {
    expect(accrueInterest(1_000_000, 6, DAYS_PER_YEAR)).toBeCloseTo(60_000, 6)
  })

  it('scales with the number of days', () => {
    const thirtyDays = accrueInterest(1_000_000, 6, 30)
    const sixtyDays = accrueInterest(1_000_000, 6, 60)
    expect(sixtyDays).toBeCloseTo(thirtyDays * 2, 6)
  })

  it('charges nothing on a cleared balance', () => {
    expect(accrueInterest(0, 6.5, 31)).toBe(0)
  })

  it('charges nothing at a zero rate', () => {
    expect(accrueInterest(1_000_000, 0, 31)).toBe(0)
  })

  it('accrues less after a principal reduction, which is the point of daily rest', () => {
    const before = accrueInterest(2_400_000, 6.5, 30)
    const after = accrueInterest(2_300_000, 6.5, 30)
    expect(after).toBeLessThan(before)
  })
})

describe('rateForMonth', () => {
  const stepped: RateTier[] = [
    { fromMonth: 1, annualRatePercent: 3 },
    { fromMonth: 37, annualRatePercent: 6.5 },
  ]

  it('applies the promotional rate through the final month of the tier', () => {
    expect(rateForMonth(stepped, 1)).toBe(3)
    expect(rateForMonth(stepped, 36)).toBe(3)
  })

  it('steps up on the first month of the next tier', () => {
    expect(rateForMonth(stepped, 37)).toBe(6.5)
    expect(rateForMonth(stepped, 300)).toBe(6.5)
  })

  it('handles more than two tiers', () => {
    const tiers: RateTier[] = [
      { fromMonth: 1, annualRatePercent: 2.5 },
      { fromMonth: 13, annualRatePercent: 3.5 },
      { fromMonth: 25, annualRatePercent: 6.75 },
    ]
    expect(rateForMonth(tiers, 12)).toBe(2.5)
    expect(rateForMonth(tiers, 13)).toBe(3.5)
    expect(rateForMonth(tiers, 24)).toBe(3.5)
    expect(rateForMonth(tiers, 25)).toBe(6.75)
  })

  it('rejects an empty schedule rather than guessing a rate', () => {
    expect(() => rateForMonth([], 1)).toThrow(/empty/)
  })
})

describe('validateRateTiers', () => {
  it('accepts a well formed schedule', () => {
    expect(
      validateRateTiers([
        { fromMonth: 1, annualRatePercent: 3 },
        { fromMonth: 37, annualRatePercent: 6.5 },
      ]),
    ).toEqual([])
  })

  it('requires the first tier to start at month 1', () => {
    const problems = validateRateTiers([{ fromMonth: 4, annualRatePercent: 3 }])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('เดือนที่ 1')
  })

  it('rejects an empty schedule', () => {
    expect(validateRateTiers([])).toHaveLength(1)
  })

  it('rejects tiers that do not move forward in time', () => {
    const problems = validateRateTiers([
      { fromMonth: 1, annualRatePercent: 3 },
      { fromMonth: 1, annualRatePercent: 6 },
    ])
    expect(problems.some((p) => p.includes('มากกว่าช่วงก่อนหน้า'))).toBe(true)
  })

  it('rejects rates outside 0-100%', () => {
    expect(validateRateTiers([{ fromMonth: 1, annualRatePercent: -1 }])).toHaveLength(1)
    expect(validateRateTiers([{ fromMonth: 1, annualRatePercent: 101 }])).toHaveLength(1)
  })

  it('reports every problem at once so the form can show them together', () => {
    const problems = validateRateTiers([{ fromMonth: 0, annualRatePercent: 200 }])
    expect(problems.length).toBeGreaterThan(1)
  })
})

describe('daysBetween', () => {
  it('counts the real length of each month', () => {
    expect(daysBetween(new Date(2026, 1, 15), new Date(2026, 2, 15))).toBe(28)
    expect(daysBetween(new Date(2026, 2, 15), new Date(2026, 3, 15))).toBe(31)
    expect(daysBetween(new Date(2026, 3, 15), new Date(2026, 4, 15))).toBe(30)
  })

  it('counts the extra day in a leap February', () => {
    expect(daysBetween(new Date(2028, 1, 15), new Date(2028, 2, 15))).toBe(29)
  })

  it('sums to a full year over twelve consecutive periods', () => {
    // This is what makes a rate/12 instalment agree with daily-rest accrual.
    const start = new Date(2026, 0, 15)
    let total = 0
    for (let month = 1; month <= 12; month++) {
      total += daysBetween(paymentDate(start, month - 1), paymentDate(start, month))
    }
    expect(total).toBe(365)
  })

  it('counts 31 days from 28 February to 31 March for a loan billed on the 31st', () => {
    // Regression: stepping back a month from 31 March lands on 3 March and
    // counted this period as 28 days.
    const start = new Date(2026, 0, 31)
    expect(daysBetween(paymentDate(start, 1), paymentDate(start, 2))).toBe(31)
  })

  it('sums to a full year for a loan billed on the 31st', () => {
    const start = new Date(2026, 0, 31)
    let total = 0
    for (let month = 1; month <= 12; month++) {
      total += daysBetween(paymentDate(start, month - 1), paymentDate(start, month))
    }
    expect(total).toBe(365)
  })
})

describe('paymentDate', () => {
  it('keeps the same day of the month', () => {
    const start = new Date(2026, 0, 15)
    expect(paymentDate(start, 1)).toEqual(new Date(2026, 1, 15))
    expect(paymentDate(start, 12)).toEqual(new Date(2027, 0, 15))
  })

  it('rolls back to the last day of a shorter month instead of overflowing', () => {
    // A loan billed on the 31st must bill on 28 February, not 3 March.
    const start = new Date(2026, 0, 31)
    expect(paymentDate(start, 1)).toEqual(new Date(2026, 1, 28))
  })

  it('uses 29 February in a leap year', () => {
    const start = new Date(2028, 0, 31)
    expect(paymentDate(start, 1)).toEqual(new Date(2028, 1, 29))
  })
})

describe('annuityPayment', () => {
  it('matches the instalment Thai lenders quote', () => {
    // 2,400,000 baht at 6.5% over 30 years is about 15,170 baht per month.
    const payment = annuityPayment(2_400_000, 6.5, 360)
    expect(payment).toBeGreaterThan(15_100)
    expect(payment).toBeLessThan(15_250)
  })

  it('splits the principal evenly when there is no interest', () => {
    expect(annuityPayment(1_200_000, 0, 12)).toBeCloseTo(100_000, 6)
  })

  it('costs more per month over a shorter term', () => {
    const short = annuityPayment(2_400_000, 6.5, 180)
    const long = annuityPayment(2_400_000, 6.5, 360)
    expect(short).toBeGreaterThan(long)
  })

  it('rejects a non-positive term instead of dividing by zero', () => {
    expect(() => annuityPayment(1_000_000, 6, 0)).toThrow(/at least one month/)
  })
})
