import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the calculated figures, not placeholder text', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'คำนวณสินเชื่อบ้าน' })).toBeInTheDocument()
    expect(screen.getByText('ค่างวดต่อเดือน')).toBeInTheDocument()

    // The instalment for this example loan is around 10,100 baht; asserting a
    // range rather than an exact string keeps the test from breaking on
    // formatting changes while still catching a broken calculation.
    const paymentText = screen.getByText('ค่างวดต่อเดือน').nextElementSibling?.textContent
    const payment = Number(paymentText?.replace(/[^0-9.]/g, ''))
    expect(payment).toBeGreaterThan(9_000)
    expect(payment).toBeLessThan(11_000)
  })
})
