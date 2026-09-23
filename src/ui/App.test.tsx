import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows both loan columns and the verdict', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'คำนวณสินเชื่อบ้าน' })).toBeInTheDocument()

    // Each loan names itself twice: once over its form, once over its totals.
    // Pinning the level keeps the query about the form specifically.
    expect(
      screen.getByRole('heading', { level: 2, name: 'สินเชื่อปัจจุบัน' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'ทางเลือกใหม่' }),
    ).toBeInTheDocument()

    // The default figures describe a worthwhile refinance, so the verdict
    // should say so rather than sitting on the fence.
    expect(screen.getByRole('heading', { name: 'คุ้มที่จะเปลี่ยน' })).toBeInTheDocument()
  })

  it('recalculates when a rate changes', async () => {
    const user = userEvent.setup()
    render(<App />)

    const netSaving = () => screen.getByText('ประหยัดสุทธิ').nextElementSibling?.textContent

    const before = netSaving()

    // Raising the alternative loan's promotional rate should erode the saving.
    const rateInputs = screen.getAllByLabelText('ช่วงที่ 1 อัตราดอกเบี้ย')
    await user.clear(rateInputs[1])
    await user.type(rateInputs[1], '6')

    expect(netSaving()).not.toBe(before)
  })

  it('warns instead of calculating when the rate tiers are invalid', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Pushing the second tier back before the first breaks the ordering rule.
    const tierMonthInputs = screen.getAllByLabelText('ช่วงที่ 2 เริ่มเดือนที่')
    await user.clear(tierMonthInputs[0])
    await user.type(tierMonthInputs[0], '0')

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(/ตรวจสอบข้อมูลที่กรอก/)).toBeInTheDocument()
  })

  it('remembers what was entered', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    const principalInput = screen.getAllByLabelText(/เงินต้นคงเหลือ/)[0]
    await user.clear(principalInput)
    await user.type(principalInput, '1500000')

    unmount()
    render(<App />)

    expect(screen.getAllByLabelText(/เงินต้นคงเหลือ/)[0]).toHaveValue(1_500_000)
  })

  it('states that the figures are not official', () => {
    render(<App />)
    expect(screen.getByText(/ยังไม่ได้เทียบกับตารางผ่อนจริงของธนาคาร/)).toBeInTheDocument()
  })

  it('switches the page theme as soon as the toggle is used', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('radio', { name: /มืด/ }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    await user.click(screen.getByRole('radio', { name: /สว่าง/ }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('keeps the choice after remounting', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.click(screen.getByRole('radio', { name: /มืด/ }))
    unmount()

    render(<App />)
    expect(screen.getByRole('radio', { name: /มืด/ })).toBeChecked()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })
})
