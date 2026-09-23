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
 * Cumulative position after refinancing: costs first, savings after.
 *
 * The line starts below zero by the up-front costs and climbs as the cheaper
 * loan saves money each month. Where it crosses zero is the break-even point —
 * refinance and move before that month and the switch has cost money.
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
          : `เงินสดสะสมเทียบกับการอยู่ที่เดิม — ตัดศูนย์เดือนที่ ${breakEvenMonth} คือจุดที่ถอนทุนค่าใช้จ่ายคืนได้`
      }
    >
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
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
