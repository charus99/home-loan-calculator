import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LoanTerms } from '../core/types'
import { LoanForm } from './LoanForm'

const TERMS: LoanTerms = {
  principal: 2_400_000,
  rateTiers: [{ fromMonth: 1, annualRatePercent: 6.5 }],
  termMonths: 480,
  monthlyPayment: 17_100,
  extraMonthlyPayment: 0,
}

function renderForm(overrides: Partial<LoanTerms> = {}) {
  const onChange = vi.fn()
  render(
    <LoanForm
      title="สินเชื่อปัจจุบัน"
      terms={{ ...TERMS, ...overrides }}
      onChange={onChange}
      askForPayment
    />,
  )
  return { onChange }
}

describe('LoanForm amount fields', () => {
  it('shows a whole amount without a decimal point', () => {
    renderForm()
    expect(screen.getByLabelText(/ค่างวดต่อเดือน/)).toHaveValue('17100')
  })

  it('accepts two decimal places', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm()

    const field = screen.getByLabelText(/ค่างวดต่อเดือน/)
    await user.clear(field)
    await user.type(field, '17110.54')

    expect(field).toHaveValue('17110.54')
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ monthlyPayment: 17_110.54 }),
    )
  })

  it('refuses a third decimal place', async () => {
    const user = userEvent.setup()
    renderForm()

    const field = screen.getByLabelText(/ค่างวดต่อเดือน/)
    await user.clear(field)
    await user.type(field, '17110.535')

    // The rejected keystroke leaves the two accepted decimals in place.
    expect(field).toHaveValue('17110.53')
  })

  it('lets a decimal point be typed without being rewritten', async () => {
    // A controlled number input turns "17110." straight back into "17110",
    // which makes a fractional amount impossible to enter at all.
    const user = userEvent.setup()
    renderForm()

    const field = screen.getByLabelText(/ค่างวดต่อเดือน/)
    await user.clear(field)
    await user.type(field, '500.')

    expect(field).toHaveValue('500.')
  })

  it('allows the field to be emptied', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm()

    const field = screen.getByLabelText(/ค่างวดต่อเดือน/)
    await user.clear(field)

    expect(field).toHaveValue('')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ monthlyPayment: 0 }))
  })

  it('rejects letters', async () => {
    const user = userEvent.setup()
    renderForm()

    const field = screen.getByLabelText(/ค่างวดต่อเดือน/)
    await user.clear(field)
    await user.type(field, 'abc')

    expect(field).toHaveValue('')
  })
})

describe('LoanForm rate field', () => {
  it('accepts a rate to two decimals', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm()

    const field = screen.getByLabelText(/ช่วงที่ 1 อัตราดอกเบี้ย/)
    await user.clear(field)
    await user.type(field, '6.13')

    // 0.05 steps would have rejected this; lenders quote rates like it.
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ rateTiers: [expect.objectContaining({ annualRatePercent: 6.13 })] }),
    )
  })

  it('refuses a rate above 100%', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm()

    const field = screen.getByLabelText(/ช่วงที่ 1 อัตราดอกเบี้ย/)
    await user.clear(field)
    await user.type(field, '150')

    const rates = onChange.mock.calls.map(
      (call) => (call[0] as LoanTerms).rateTiers[0].annualRatePercent,
    )
    expect(rates).not.toContain(150)
  })
})
