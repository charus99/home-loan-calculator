import type { RateTier } from './types'

/**
 * Days used per year when converting an annual rate to a daily one.
 *
 * Thai lenders conventionally divide by 365 even in leap years. This is an
 * assumption carried from docs/REQUIREMENTS.md section 2.4 and has not been
 * confirmed against a real loan agreement yet.
 */
export const DAYS_PER_YEAR = 365

/**
 * Interest accrued on a balance over a number of days.
 *
 * Thai home loans use daily rest: interest is charged on the principal
 * outstanding each day, which is why paying extra reduces the very next
 * month's interest rather than only shortening the term.
 */
export function accrueInterest(
  balance: number,
  annualRatePercent: number,
  days: number,
): number {
  return (balance * (annualRatePercent / 100) * days) / DAYS_PER_YEAR
}

/**
 * The annual rate that applies to a given month of the loan.
 *
 * Tiers are matched by the latest one whose fromMonth has been reached, so a
 * schedule of [{1, 3.0}, {37, 6.5}] gives 3.0% for months 1-36 and 6.5% after.
 */
export function rateForMonth(tiers: RateTier[], month: number): number {
  if (tiers.length === 0) {
    throw new Error('Rate schedule is empty; at least one tier is required')
  }

  let applicable = tiers[0]
  for (const tier of tiers) {
    if (tier.fromMonth <= month) {
      applicable = tier
    }
  }
  return applicable.annualRatePercent
}

/**
 * Validates a rate schedule, returning the problems found.
 *
 * Returning a list rather than throwing lets the UI show every problem with the
 * form at once instead of one per submission.
 */
export function validateRateTiers(tiers: RateTier[]): string[] {
  const problems: string[] = []

  if (tiers.length === 0) {
    problems.push('ต้องระบุอัตราดอกเบี้ยอย่างน้อยหนึ่งช่วง')
    return problems
  }

  if (tiers[0].fromMonth !== 1) {
    problems.push('ช่วงอัตราดอกเบี้ยแรกต้องเริ่มที่เดือนที่ 1')
  }

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i]

    if (!Number.isInteger(tier.fromMonth) || tier.fromMonth < 1) {
      problems.push(`ช่วงที่ ${i + 1}: เดือนเริ่มต้นต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป`)
    }
    if (tier.annualRatePercent < 0 || tier.annualRatePercent > 100) {
      problems.push(`ช่วงที่ ${i + 1}: อัตราดอกเบี้ยต้องอยู่ระหว่าง 0 ถึง 100%`)
    }
    if (i > 0 && tier.fromMonth <= tiers[i - 1].fromMonth) {
      problems.push(`ช่วงที่ ${i + 1}: เดือนเริ่มต้นต้องมากกว่าช่วงก่อนหน้า`)
    }
  }

  return problems
}

/**
 * The number of days in the billing period that ends on the given payment date.
 *
 * Interest is accrued on real calendar days, so a payment falling in March
 * covers 31 days while one in February covers 28. Over a year these add up to
 * 365 (or 366 in a leap year), which is what makes the schedule agree with the
 * instalment the annuity formula produces.
 */
export function daysInPeriod(periodEnd: Date): number {
  const periodStart = new Date(periodEnd)
  periodStart.setMonth(periodStart.getMonth() - 1)

  const millisecondsPerDay = 24 * 60 * 60 * 1000
  return Math.round((periodEnd.getTime() - periodStart.getTime()) / millisecondsPerDay)
}

/**
 * The date of the nth payment, counting from the schedule's start date.
 *
 * Uses the same day of the month throughout. A start date late in the month
 * rolls back to the last day of shorter months, so a loan starting 31 January
 * bills on 28 February rather than spilling into March.
 */
export function paymentDate(startDate: Date, monthNumber: number): Date {
  const dayOfMonth = startDate.getDate()
  const date = new Date(startDate)

  // Set the day to 1 before shifting months, otherwise a day beyond the target
  // month's length silently rolls into the following month.
  date.setDate(1)
  date.setMonth(date.getMonth() + monthNumber)

  const daysInTargetMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate()
  date.setDate(Math.min(dayOfMonth, daysInTargetMonth))

  return date
}

/**
 * The fixed monthly payment that retires a loan over a given term at one rate.
 *
 * Uses the standard annuity formula with a period rate of rate/12, which is how
 * Thai lenders set the instalment. The schedule then accrues interest on real
 * calendar days; the two agree because twelve monthly periods span a full year.
 *
 * Lenders apply this with the first tier's promotional rate, so the instalment
 * stays fixed while the rate steps up — which is why a stepped loan often needs
 * longer than advertised to actually finish.
 */
export function annuityPayment(
  principal: number,
  annualRatePercent: number,
  termMonths: number,
): number {
  if (termMonths <= 0) {
    throw new Error('Term must be at least one month')
  }

  const monthlyRate = annualRatePercent / 100 / 12
  if (monthlyRate === 0) {
    return principal / termMonths
  }

  const growth = Math.pow(1 + monthlyRate, termMonths)
  return (principal * monthlyRate * growth) / (growth - 1)
}
