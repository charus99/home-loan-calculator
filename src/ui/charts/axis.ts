/**
 * Ticks for an x-axis that holds month numbers but reads in years.
 *
 * Letting Recharts pick ticks off a month scale and then dividing by twelve in
 * the formatter produces repeated labels — "0 0 1 1 2 2" — because several
 * chosen months round to the same year. Choosing the tick positions here keeps
 * one label per year and spaces them so they do not collide on a narrow chart.
 */
export function buildYearTicks(totalMonths: number): number[] {
  const totalYears = Math.ceil(totalMonths / 12)

  // Roughly ten labels is what fits without overlapping at typical widths.
  const yearStep = Math.max(1, Math.ceil(totalYears / 10))

  const ticks: number[] = []
  for (let year = 0; year <= totalYears; year += yearStep) {
    const month = year * 12 + 1
    if (month <= totalMonths) {
      ticks.push(month)
    }
  }
  return ticks
}

/** Renders a month position as its year number. */
export function formatYearTick(month: number): string {
  return String(Math.floor((month - 1) / 12))
}
