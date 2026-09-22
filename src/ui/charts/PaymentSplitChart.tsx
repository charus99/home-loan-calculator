import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts'
import type { Schedule } from '../../core/types'
import { CHART_CHROME, PAYMENT_SPLIT_COLORS } from '../chartTheme'
import { ChartFrame } from './BalanceChart'
import { formatTooltipBaht, formatYearLabel } from './tooltipFormatters'

interface PaymentSplitChartProps {
  schedule: Schedule
  title: string
}

/**
 * How each instalment divides between interest and principal.
 *
 * Shows why early payments barely dent the debt: the interest share dominates
 * for years before the balance falls far enough to tip the ratio.
 *
 * Sampled yearly rather than monthly — 360 bars would render as a solid block
 * and say less than 30 readable ones.
 */
export function PaymentSplitChart({ schedule, title }: PaymentSplitChartProps) {
  // One bar per year is still 22 bars on a half-width chart, which crowds the
  // labels. Sampling every other year keeps the shape of the shift readable.
  const yearlyRows = schedule.rows.filter((row) => row.month % 12 === 1)
  const yearStep = yearlyRows.length > 12 ? 2 : 1

  const data = yearlyRows
    .filter((_, index) => index % yearStep === 0)
    .map((row) => ({
      year: Math.floor((row.month - 1) / 12) + 1,
      interest: row.interest,
      principal: row.principal,
    }))

  return (
    <ChartFrame title={title} description="ช่วงแรกจ่ายดอกเบี้ยเป็นส่วนใหญ่ (ตัวอย่างงวดแรกของแต่ละปี)">
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={CHART_CHROME.gridline} vertical={false} />
        <XAxis
          dataKey="year"
          stroke={CHART_CHROME.axis}
          tick={{ fill: CHART_CHROME.mutedText, fontSize: 12 }}
          label={{ value: 'ปี', position: 'insideBottomRight', offset: -4, fontSize: 12 }}
        />
        <YAxis
          tickFormatter={(value: number) => `${Math.round(value / 1_000)}k`}
          stroke={CHART_CHROME.axis}
          tick={{ fill: CHART_CHROME.mutedText, fontSize: 12 }}
          width={48}
        />
        <Tooltip formatter={formatTooltipBaht} labelFormatter={formatYearLabel} />
        <Legend />
        <Bar
          dataKey="interest"
          name="ดอกเบี้ย"
          stackId="payment"
          fill={PAYMENT_SPLIT_COLORS.interest}
        />
        <Bar
          dataKey="principal"
          name="เงินต้น"
          stackId="payment"
          fill={PAYMENT_SPLIT_COLORS.principal}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartFrame>
  )
}
