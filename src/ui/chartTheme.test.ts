import { describe, expect, it } from 'vitest'
import { chartTheme } from './chartTheme'

describe('chartTheme', () => {
  it('gives each scheme its own surface', () => {
    expect(chartTheme('light').chrome.surface).not.toBe(chartTheme('dark').chrome.surface)
  })

  it('keeps the two compared loans in distinct hues in both schemes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const { loan } = chartTheme(scheme)
      expect(loan.current).not.toBe(loan.alternative)
    }
  })

  it('keeps principal and interest distinguishable in both schemes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const { paymentSplit } = chartTheme(scheme)
      expect(paymentSplit.principal).not.toBe(paymentSplit.interest)
    }
  })

  it('returns every colour as a full-length hex value', () => {
    // Guards against a half-edited entry: the palette validator was run
    // against these exact strings, so a shorthand or named colour here would
    // be a value nobody checked.
    const hex = /^#[0-9a-f]{6}$/
    for (const scheme of ['light', 'dark'] as const) {
      const theme = chartTheme(scheme)
      const values = [
        ...Object.values(theme.loan),
        ...Object.values(theme.paymentSplit),
        ...Object.values(theme.chrome),
        theme.breakEven,
      ]
      for (const value of values) {
        expect(value).toMatch(hex)
      }
    }
  })

  it('treats an unknown scheme as light rather than failing', () => {
    expect(chartTheme('light')).toBe(chartTheme('light'))
  })
})
