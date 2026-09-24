import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const calculateButton = () => screen.getByRole('button', { name: 'คำนวณ' })

/** Reads a month count out of a rendered duration such as "22 ปี 6 เดือน". */
function monthsFrom(text: string): number {
  const years = Number(text.match(/(\d+)\s*ปี/)?.[1] ?? 0)
  const months = Number(text.match(/(\d+)\s*เดือน/)?.[1] ?? 0)
  return years * 12 + months
}

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

  it('recalculates when the button is pressed', async () => {
    const user = userEvent.setup()
    render(<App />)

    const netSaving = () => screen.getByText('ประหยัดสุทธิ').nextElementSibling?.textContent

    const before = netSaving()

    // Raising the alternative loan's promotional rate should erode the saving.
    const rateInputs = screen.getAllByLabelText('ช่วงที่ 1 อัตราดอกเบี้ย')
    await user.clear(rateInputs[1])
    await user.type(rateInputs[1], '6')
    await user.click(calculateButton())

    expect(netSaving()).not.toBe(before)
  })

  it('leaves the results alone until the button is pressed', async () => {
    const user = userEvent.setup()
    render(<App />)

    const netSaving = () => screen.getByText('ประหยัดสุทธิ').nextElementSibling?.textContent
    const before = netSaving()

    const rateInputs = screen.getAllByLabelText('ช่วงที่ 1 อัตราดอกเบี้ย')
    await user.clear(rateInputs[1])
    await user.type(rateInputs[1], '6')

    expect(netSaving()).toBe(before)
  })

  it('flags results as out of date after an edit, so they are not trusted', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(calculateButton()).toBeDisabled()

    const [currentPayment] = screen.getAllByLabelText(/ค่างวดต่อเดือน/)
    await user.type(currentPayment, '5')

    expect(calculateButton()).toBeEnabled()
    expect(screen.getByRole('status')).toHaveTextContent(/กดคำนวณ/)
    // The payoff line under each form no longer quotes the stale figure.
    expect(screen.queryAllByText(/หมดหนี้ใน/)).toHaveLength(0)

    await user.click(calculateButton())

    expect(calculateButton()).toBeDisabled()
    expect(screen.getAllByText(/หมดหนี้ใน/)).toHaveLength(2)
  })

  it('calculates when Enter is pressed in a field', async () => {
    const user = userEvent.setup()
    render(<App />)

    const netSaving = () => screen.getByText('ประหยัดสุทธิ').nextElementSibling?.textContent
    const before = netSaving()

    const rateInputs = screen.getAllByLabelText('ช่วงที่ 1 อัตราดอกเบี้ย')
    await user.clear(rateInputs[1])
    await user.type(rateInputs[1], '6{Enter}')

    expect(netSaving()).not.toBe(before)
    expect(calculateButton()).toBeDisabled()
  })

  it('warns instead of calculating when the rate tiers are invalid', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Pushing the second tier back before the first breaks the ordering rule.
    const tierMonthInputs = screen.getAllByLabelText('ช่วงที่ 2 เริ่มเดือนที่')
    await user.clear(tierMonthInputs[0])
    await user.type(tierMonthInputs[0], '0')
    await user.click(calculateButton())

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

    expect(screen.getAllByLabelText(/เงินต้นคงเหลือ/)[0]).toHaveValue('1,500,000')
  })

  it('offers an instalment field in both columns', () => {
    render(<App />)
    expect(screen.getAllByLabelText(/ค่างวดต่อเดือน/)).toHaveLength(2)
  })

  it("compares at the current instalment until the alternative's own is given", async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText(/กำลังเทียบด้วยค่างวดเท่ากับสินเชื่อปัจจุบัน/)).toBeInTheDocument()

    const [, alternativePayment] = screen.getAllByLabelText(/ค่างวดต่อเดือน/)
    await user.clear(alternativePayment)
    await user.type(alternativePayment, '14000')

    // A quoted instalment takes over, and the inheritance note goes away.
    expect(screen.queryByText(/กำลังเทียบด้วยค่างวดเท่ากับสินเชื่อปัจจุบัน/)).toBeNull()
  })

  it("lengthens the alternative's term when its instalment is lower", async () => {
    const user = userEvent.setup()
    render(<App />)

    const before = monthsFrom(screen.getAllByText(/หมดหนี้ใน/)[1].textContent ?? '')

    const [, alternativePayment] = screen.getAllByLabelText(/ค่างวดต่อเดือน/)
    await user.clear(alternativePayment)
    await user.type(alternativePayment, '14000')
    await user.click(calculateButton())

    const after = monthsFrom(screen.getAllByText(/หมดหนี้ใน/)[1].textContent ?? '')
    expect(after).toBeGreaterThan(before)
  })

  it('reports how long each loan takes to clear', () => {
    render(<App />)

    const payoffs = screen.getAllByText(/หมดหนี้ใน/)
    expect(payoffs).toHaveLength(2)
  })

  it('clears the debt sooner on the cheaper loan at the same payment', () => {
    render(<App />)

    // Both columns pay the same instalment, so the cheaper rate must finish
    // first — that shorter term is the whole benefit being measured.
    const [currentPayoff, alternativePayoff] = screen
      .getAllByText(/หมดหนี้ใน/)
      .map((el) => el.textContent ?? '')

    expect(monthsFrom(currentPayoff)).toBeGreaterThan(monthsFrom(alternativePayoff))
    expect(screen.getByRole('heading', { name: 'คุ้มที่จะเปลี่ยน' })).toBeInTheDocument()
  })


  it('refuses to calculate without an instalment', async () => {
    const user = userEvent.setup()
    render(<App />)

    // The current loan's field, which is the required one.
    const [currentPayment] = screen.getAllByLabelText(/ค่างวดต่อเดือน/)
    await user.clear(currentPayment)
    await user.click(calculateButton())

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(/ต้องกรอกค่างวดต่อเดือน/)).toBeInTheDocument()
  })

  it('dates the schedule from the next payment date entered', async () => {
    const user = userEvent.setup()
    render(<App />)

    const dateInput = screen.getByLabelText(/วันชำระงวดถัดไป/)
    await user.clear(dateInput)
    await user.type(dateInput, '2027-03-31')
    await user.click(calculateButton())

    // First row of the current loan's table falls on that date, in the
    // Buddhist-calendar form a Thai statement prints.
    const [firstTable] = screen.getAllByRole('table')
    const firstRow = within(firstTable).getAllByRole('row')[1]
    expect(firstRow).toHaveTextContent('31 มี.ค. 70')
  })

  it('refuses to calculate without a payment date', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.clear(screen.getByLabelText(/วันชำระงวดถัดไป/))
    await user.click(calculateButton())

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(/ต้องกรอกวันชำระงวดถัดไป/)).toBeInTheDocument()
  })

  it('shows each loan’s total interest in the verdict', () => {
    render(<App />)
    expect(screen.getByText(/ดอกเบี้ยรวมทั้งสัญญา — ปัจจุบัน/)).toBeInTheDocument()
    expect(screen.getByText(/ดอกเบี้ยรวมทั้งสัญญา — ทางเลือกใหม่/)).toBeInTheDocument()
  })

  describe('lump sum', () => {
    async function enterLumpSum(user: ReturnType<typeof userEvent.setup>, amount: string, date: string) {
      const amountField = screen.getByLabelText(/ยอดโปะ/)
      await user.clear(amountField)
      await user.type(amountField, amount)
      const dateField = screen.getByLabelText(/วันที่โปะ/)
      await user.clear(dateField)
      if (date) {
        await user.type(dateField, date)
      }
    }

    it('shortens both loans by the same money', async () => {
      const user = userEvent.setup()
      render(<App />)

      const payoffs = () => screen.getAllByText(/หมดหนี้ใน/).map((el) => monthsFrom(el.textContent ?? ''))
      const [currentBefore, alternativeBefore] = payoffs()

      await user.clear(screen.getByLabelText(/วันชำระงวดถัดไป/))
      await user.type(screen.getByLabelText(/วันชำระงวดถัดไป/), '2026-10-24')
      await enterLumpSum(user, '100000', '2026-12-31')
      await user.click(calculateButton())

      const [currentAfter, alternativeAfter] = payoffs()
      expect(currentAfter).toBeLessThan(currentBefore)
      expect(alternativeAfter).toBeLessThan(alternativeBefore)
    })

    it('names the instalment the lump sum lands in', async () => {
      const user = userEvent.setup()
      render(<App />)

      await user.clear(screen.getByLabelText(/วันชำระงวดถัดไป/))
      await user.type(screen.getByLabelText(/วันชำระงวดถัดไป/), '2026-10-24')
      await enterLumpSum(user, '100000', '2026-12-31')
      await user.click(calculateButton())

      // 31 Dec falls after the 24 Dec instalment, so it goes with 24 Jan.
      expect(screen.getAllByText(/ในงวดที่ 4 \(24 ม\.ค\. 70\)/)).toHaveLength(2)
    })

    it('repeats a yearly lump sum on the same day each year', async () => {
      const user = userEvent.setup()
      render(<App />)

      const currentPayoff = () => monthsFrom(screen.getAllByText(/หมดหนี้ใน/)[0].textContent ?? '')

      await user.clear(screen.getByLabelText(/วันชำระงวดถัดไป/))
      await user.type(screen.getByLabelText(/วันชำระงวดถัดไป/), '2026-10-24')
      await enterLumpSum(user, '100000', '2026-12-31')
      await user.click(calculateButton())
      const once = currentPayoff()

      await user.click(screen.getByRole('radio', { name: /ทุกปี/ }))
      expect(screen.getByLabelText(/วันที่โปะครั้งแรก/)).toBeInTheDocument()
      await user.click(calculateButton())

      expect(currentPayoff()).toBeLessThan(once)
      // Each 31 Dec lump joins the 24 Jan instalment after it, twelve apart.
      const [currentNote] = screen.getAllByText(/โปะเงินก้อน \d+ ครั้ง/)
      expect(currentNote).toHaveTextContent('ครั้งแรกงวดที่ 4 (24 ม.ค. 70)')
      const [firstTable] = screen.getAllByRole('table')
      await user.click(screen.getAllByRole('button', { name: /ดูทั้งหมด/ })[0])
      const month16 = within(firstTable).getAllByRole('row')[16]
      expect(month16).toHaveTextContent('24 ม.ค. 71')
      expect(month16).toHaveTextContent(/รวมโปะก้อน ฿100,000/)
    })

    it('treats a lump sum saved before the repeat option as one-off', () => {
      localStorage.setItem('home-loan:lump-sum', JSON.stringify({ amount: 100000, date: '2026-12-31' }))
      render(<App />)

      expect(screen.getByRole('radio', { name: 'ครั้งเดียว' })).toBeChecked()
      expect(calculateButton()).toBeDisabled()
    })

    it('asks for a date once an amount is entered', async () => {
      const user = userEvent.setup()
      render(<App />)

      await enterLumpSum(user, '100000', '')
      await user.click(calculateButton())

      const alert = await screen.findByRole('alert')
      expect(within(alert).getByText(/ต้องกรอกวันที่โปะด้วย/)).toBeInTheDocument()
    })

    it('refuses a date before the current period, which the balance already reflects', async () => {
      const user = userEvent.setup()
      render(<App />)

      await user.clear(screen.getByLabelText(/วันชำระงวดถัดไป/))
      await user.type(screen.getByLabelText(/วันชำระงวดถัดไป/), '2026-10-24')
      await enterLumpSum(user, '100000', '2026-08-01')
      await user.click(calculateButton())

      const alert = await screen.findByRole('alert')
      expect(within(alert).getByText(/ต้องไม่ก่อนงวดที่กำลังผ่อนอยู่/)).toBeInTheDocument()
    })
  })

  describe('save as PDF', () => {
    const pdfButton = () => screen.getByRole('button', { name: 'บันทึกเป็น PDF' })

    it('opens the print dialog, where the PDF is saved', async () => {
      const user = userEvent.setup()
      const print = vi.spyOn(window, 'print').mockImplementation(() => {})
      render(<App />)

      await user.click(pdfButton())
      expect(print).toHaveBeenCalledOnce()
      print.mockRestore()
    })

    it('is unavailable while the results are out of date', async () => {
      const user = userEvent.setup()
      render(<App />)

      const [currentPayment] = screen.getAllByLabelText(/ค่างวดต่อเดือน/)
      await user.type(currentPayment, '5')
      expect(pdfButton()).toBeDisabled()

      await user.click(calculateButton())
      expect(pdfButton()).toBeEnabled()
    })

    it('puts every instalment in the page, not only the rows shown', () => {
      render(<App />)

      const [firstTable] = screen.getAllByRole('table')
      const months = within(firstTable).getAllByRole('row').length - 1
      const payoff = monthsFrom(screen.getAllByText(/หมดหนี้ใน/)[0].textContent ?? '')
      expect(months).toBe(payoff)
    })
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
