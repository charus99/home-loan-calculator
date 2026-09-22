import type { ReactNode } from 'react'
import { formatBaht } from '../format'

/**
 * Tooltip formatters that tolerate the values Recharts actually passes.
 *
 * Recharts types both the value and the label as possibly undefined or
 * non-numeric, because a tooltip can fire on a gap in the data. Coercing here
 * keeps every chart from repeating the same guard.
 */

export function formatTooltipBaht(value: unknown): string {
  return typeof value === 'number' ? formatBaht(value) : '—'
}

export function formatMonthLabel(label: ReactNode): string {
  return typeof label === 'number' ? `เดือนที่ ${label}` : ''
}

export function formatYearLabel(label: ReactNode): string {
  return typeof label === 'number' ? `ปีที่ ${label}` : ''
}
