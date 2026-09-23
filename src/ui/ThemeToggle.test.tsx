import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  it('offers all three choices, so system is reachable again', () => {
    render(<ThemeToggle preference="system" onChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: /ตามระบบ/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /สว่าง/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /มืด/ })).toBeInTheDocument()
  })

  it('marks the active choice', () => {
    render(<ThemeToggle preference="dark" onChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: /มืด/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /สว่าง/ })).not.toBeChecked()
  })

  it('reports the chosen preference', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ThemeToggle preference="system" onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: /มืด/ }))

    expect(onChange).toHaveBeenCalledWith('dark')
  })

  it('is labelled for screen readers', () => {
    render(<ThemeToggle preference="system" onChange={vi.fn()} />)
    expect(screen.getByRole('group', { name: 'ธีมสี' })).toBeInTheDocument()
  })
})
