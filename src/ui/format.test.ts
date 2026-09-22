import { describe, expect, it } from 'vitest'
import { formatBaht, formatBahtPrecise, formatDuration, formatRate } from './format'

describe('formatBaht', () => {
  it('groups thousands and drops the satang', () => {
    expect(formatBaht(2_400_000)).toContain('2,400,000')
  })

  it('rounds rather than truncating', () => {
    expect(formatBaht(15_169.78)).toContain('15,170')
  })

  it('handles zero', () => {
    expect(formatBaht(0)).toContain('0')
  })
})

describe('formatBahtPrecise', () => {
  it('keeps two decimal places so schedule rows reconcile', () => {
    expect(formatBahtPrecise(15_169.784)).toContain('15,169.78')
  })
})

describe('formatRate', () => {
  it('always shows two decimals so rates line up in a column', () => {
    expect(formatRate(6.5)).toBe('6.50%')
    expect(formatRate(3)).toBe('3.00%')
    expect(formatRate(6.125)).toBe('6.13%')
  })
})

describe('formatDuration', () => {
  it('reads as years and months rather than a month count', () => {
    expect(formatDuration(270)).toBe('22 ปี 6 เดือน')
  })

  it('omits months when the term is whole years', () => {
    expect(formatDuration(360)).toBe('30 ปี')
  })

  it('omits years for a term under a year', () => {
    expect(formatDuration(7)).toBe('7 เดือน')
  })
})
