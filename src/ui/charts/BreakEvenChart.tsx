import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RefinanceComparison } from '../../core/types'
import { chartTheme } from '../chartTheme'
import { useTheme } from '../ThemeContext'
import { buildYearTicks, formatYearTick } from './axis'
import { ChartFrame } from './BalanceChart'
import { formatMonthLabel, formatTooltipBaht } from './tooltipFormatters'

interface BreakEvenChartProps {
  comparison: RefinanceComparison
}

/**
 * Interest saved to date, less the up-front costs.
 *
 * The line starts below zero by the costs and climbs by the interest the new
 * loan does not charge each month. Where it crosses zero for good is the
 * break-even point; it ends at the net saving shown in the verdict.
 */
export function BreakEvenChart({ comparison }: BreakEvenChartProps) {
  const theme = chartTheme(useTheme())
  const { cumulativeNet, breakEvenMonth } = comparison

  const data = cumulativeNet.map((net, index) => ({ month: index + 1, net }))
  const yearTicks = buildYearTicks(data.length)

  return (
    <ChartFrame
      title="จุดคุ้มทุน"
      description={
        breakEvenMonth === null
          ? 'ทางเลือกนี้ไม่คืนทุนตลอดอายุสัญญา'
          : `ดอกเบี้ยที่ประหยัดได้สะสม หักค่าใช้จ่ายรีไฟแนนซ์ — ตัดศูนย์เดือนที่ ${breakEvenMonth} คือจุดที่ค่าใช้จ่ายถูกชดเชยหมด`
      }
    >
      {/* Extra top margin: the break-even label sits above the plot and was
          clipped at 8px. */}
      <AreaChart data={data} margin={{ top: 24, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={theme.chrome.gridline} vertical={false} />
        <XAxis
          dataKey="month"
          type="number"
          domain={[1, data.length]}
          ticks={yearTicks}
          tickFormatter={formatYearTick}
          stroke={theme.chrome.axis}
          tick={{ fill: theme.chrome.mutedText, fontSize: 12 }}
          label={{ value: 'ปี', position: 'insideBottomRight', offset: -4, fontSize: 12 }}
        />
        <YAxis
          tickFormatter={(value: number) => `${Math.round(value / 1_000)}k`}
          stroke={theme.chrome.axis}
          tick={{ fill: theme.chrome.mutedText, fontSize: 12 }}
          width={56}
        />
        <Tooltip formatter={formatTooltipBaht} labelFormatter={formatMonthLabel} />
        <ReferenceLine y={0} stroke={theme.chrome.axis} strokeWidth={1} />
        {breakEvenMonth !== null ? (
          <ReferenceLine
            x={breakEvenMonth}
            stroke={theme.breakEven}
            strokeDasharray="4 4"
            label={{ value: 'คืนทุน', position: 'top', fill: theme.breakEven, fontSize: 12 }}
          />
        ) : null}
        <Area
          type="monotone"
          dataKey="net"
          name="สถานะสุทธิ"
          stroke={theme.loan.alternative}
          strokeWidth={2}
          fill={theme.loan.alternative}
          fillOpacity={0.12}
        />
      </AreaChart>
    </ChartFrame>
  )
}
