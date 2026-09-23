import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Schedule } from '../../core/types'
import { chartTheme } from '../chartTheme'
import { useColorScheme } from '../useColorScheme'
import { buildYearTicks, formatYearTick } from './axis'
import { formatMonthLabel, formatTooltipBaht } from './tooltipFormatters'

interface BalanceChartProps {
  current: Schedule
  alternative: Schedule
}

/**
 * Outstanding principal over time for both loans.
 *
 * Answers "when does the debt actually end" — the point where each line reaches
 * zero is the payoff date, and the gap between them is what refinancing buys.
 */
export function BalanceChart({ current, alternative }: BalanceChartProps) {
  const theme = chartTheme(useColorScheme())
  const horizon = Math.max(current.rows.length, alternative.rows.length)

  const data = Array.from({ length: horizon }, (_, index) => ({
    month: index + 1,
    // A cleared loan holds at zero rather than leaving a gap in the line.
    current: current.rows[index]?.balance ?? 0,
    alternative: alternative.rows[index]?.balance ?? 0,
  }))

  const yearTicks = buildYearTicks(horizon)

  return (
    <ChartFrame title="เงินต้นคงเหลือ" description="เส้นที่แตะศูนย์ก่อนคือหมดหนี้ก่อน">
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={theme.chrome.gridline} vertical={false} />
        <XAxis
          dataKey="month"
          type="number"
          domain={[1, horizon]}
          ticks={yearTicks}
          tickFormatter={formatYearTick}
          stroke={theme.chrome.axis}
          tick={{ fill: theme.chrome.mutedText, fontSize: 12 }}
          label={{ value: 'ปี', position: 'insideBottomRight', offset: -4, fontSize: 12 }}
        />
        <YAxis
          tickFormatter={(value: number) => `${(value / 1_000_000).toFixed(1)}M`}
          stroke={theme.chrome.axis}
          tick={{ fill: theme.chrome.mutedText, fontSize: 12 }}
          width={48}
        />
        <Tooltip formatter={formatTooltipBaht} labelFormatter={formatMonthLabel} />
        <Legend />
        <Line
          type="monotone"
          dataKey="current"
          name="สินเชื่อปัจจุบัน"
          stroke={theme.loan.current}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="alternative"
          name="ทางเลือกใหม่"
          stroke={theme.loan.alternative}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartFrame>
  )
}

/** Shared wrapper so every chart gets the same title, spacing and sizing. */
export function ChartFrame({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactElement
}) {
  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <figcaption className="mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {description ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </figcaption>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
