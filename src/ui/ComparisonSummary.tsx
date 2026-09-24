import type { RefinanceComparison } from '../core/types'
import { chartTheme } from './chartTheme'
import { formatBaht, formatDuration } from './format'
import { useTheme } from './ThemeContext'

interface ComparisonSummaryProps {
  comparison: RefinanceComparison
}

/**
 * The verdict: what the two loans cost, and whether moving is worth it.
 *
 * Leads with the net figure rather than the headline instalment, because a
 * lower instalment on a longer term can still cost more overall.
 */
export function ComparisonSummary({ comparison }: ComparisonSummaryProps) {
  const { current, alternative, totalCosts, grossInterestSaved, netSaving } = comparison
  const worthwhile = netSaving > 0

  // The trap this calculator exists for: a smaller instalment that costs more
  // over the life of the loan. Without calling it out, the headline figure
  // people look at first points the wrong way.
  const cheaperMonthlyButCostlier =
    !worthwhile && alternative.rows[0].payment < current.rows[0].payment

  const loanColors = chartTheme(useTheme()).loan

  return (
    <section className="space-y-4">
      {/* The answer the visitor came for, so it leads and is the largest thing
          on the page. The two loans' details follow as supporting evidence. */}
      <div
        className={`rounded-2xl border-2 p-6 sm:p-8 ${
          worthwhile
            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950'
            : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold text-white ${
              worthwhile ? 'bg-emerald-600' : 'bg-amber-500'
            }`}
          >
            {worthwhile ? '✓' : '!'}
          </span>
          <h2 className="ink-strong text-2xl font-bold">
            {worthwhile ? 'คุ้มที่จะเปลี่ยน' : 'ยังไม่คุ้มที่จะเปลี่ยน'}
          </h2>
        </div>
        <p className="sr-only">สรุปผลการเปรียบเทียบระหว่างสินเชื่อปัจจุบันกับทางเลือกใหม่</p>

        {cheaperMonthlyButCostlier ? (
          <p className="mt-4 rounded-lg bg-white/70 p-3 text-sm text-amber-900 dark:bg-black/30 dark:text-amber-200">
            <strong>ระวัง:</strong> ค่างวดต่อเดือนถูกลงก็จริง
            แต่ดอกเบี้ยรวมตลอดสัญญาแพงกว่าเดิม เพราะค่างวดถูกตั้งจากอัตราโปรโมชัน
            พอหมดโปรฯ ค่างวดเท่าเดิมจะตัดเงินต้นได้น้อยลง
          </p>
        ) : null}

        {/* Total interest side by side, large: this is what each choice
            costs over its whole life, and the gap between them is the saving. */}
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <InterestTotal
            label="ดอกเบี้ยรวมทั้งสัญญา — ปัจจุบัน"
            amount={current.totalInterest}
            accentColor={loanColors.current}
          />
          <InterestTotal
            label="ดอกเบี้ยรวมทั้งสัญญา — ทางเลือกใหม่"
            amount={alternative.totalInterest}
            accentColor={loanColors.alternative}
          />
        </dl>

        <dl className="mt-6 grid gap-6 sm:grid-cols-[1.4fr_1fr_1fr] sm:items-end">
          <div>
            <dt className="ink text-sm">ประหยัดสุทธิ</dt>
            <dd
              className={`text-4xl font-bold tabular-nums sm:text-5xl ${
                worthwhile
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-amber-700 dark:text-amber-300'
              }`}
            >
              {formatBaht(netSaving)}
            </dd>
          </div>
          <div>
            <dt className="ink text-sm">
              {comparison.monthsSaved >= 0 ? 'หมดหนี้เร็วขึ้น' : 'หมดหนี้ช้าลง'}
            </dt>
            <dd className="ink-strong text-xl font-semibold">
              {comparison.monthsSaved === 0
                ? 'เท่าเดิม'
                : formatDuration(Math.abs(comparison.monthsSaved))}
            </dd>
          </div>
          <div>
            <dt className="ink text-sm">ดอกที่ประหยัดได้ครอบคลุมค่าใช้จ่าย</dt>
            <dd className="ink-strong text-xl font-semibold">
              {comparison.breakEvenMonth === null
                ? 'ไม่คืนทุน'
                : `เดือนที่ ${comparison.breakEvenMonth}`}
            </dd>
          </div>
        </dl>

        {/* How the net figure was reached, so it can be checked by hand. */}
        <p className="ink hairline mt-6 border-t pt-4 text-sm tabular-nums">
          ดอกเบี้ยที่ประหยัดได้ {formatBaht(grossInterestSaved)} − ค่าใช้จ่าย{' '}
          {formatBaht(totalCosts)} = <strong>{formatBaht(netSaving)}</strong>
          {comparison.breakEvenMonth === null ? (
            <span className="block">ไม่มีจุดคุ้มทุน — ทางเลือกนี้ไม่คืนทุนตลอดอายุสัญญา</span>
          ) : null}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LoanTotals
          title="สินเชื่อปัจจุบัน"
          accentColor={loanColors.current}
          monthlyPayment={current.rows[0].payment}
          totalInterest={current.totalInterest}
          totalPaid={current.totalPaid}
          monthsToPayoff={current.monthsToPayoff}
          hasNegativeAmortization={current.hasNegativeAmortization}
        />
        <LoanTotals
          title="ทางเลือกใหม่"
          accentColor={loanColors.alternative}
          monthlyPayment={alternative.rows[0].payment}
          totalInterest={alternative.totalInterest}
          totalPaid={alternative.totalPaid}
          monthsToPayoff={alternative.monthsToPayoff}
          hasNegativeAmortization={alternative.hasNegativeAmortization}
        />
      </div>
    </section>
  )
}

function InterestTotal({
  label,
  amount,
  accentColor,
}: {
  label: string
  amount: number
  accentColor: string
}) {
  return (
    <div className="rounded-xl bg-white/70 p-4 dark:bg-black/25">
      <dt className="ink flex items-center gap-2 text-sm">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        {label}
      </dt>
      <dd className="ink-strong mt-1 text-3xl font-bold tabular-nums">{formatBaht(amount)}</dd>
    </div>
  )
}

interface LoanTotalsProps {
  title: string
  monthlyPayment: number
  totalInterest: number
  totalPaid: number
  monthsToPayoff: number
  hasNegativeAmortization: boolean
  /** The loan's chart colour, so these totals read as belonging to it. */
  accentColor: string
}

function LoanTotals({
  title,
  monthlyPayment,
  totalInterest,
  totalPaid,
  monthsToPayoff,
  hasNegativeAmortization,
  accentColor,
}: LoanTotalsProps) {
  return (
    <div className="panel p-5">
      <h3 className="ink-strong flex items-center gap-2 font-semibold">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        {title}
      </h3>

      {hasNegativeAmortization ? (
        <p
          role="alert"
          className="mt-2 rounded bg-red-50 p-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300"
        >
          ค่างวดไม่พอจ่ายดอกเบี้ย หนี้จะเพิ่มขึ้นแทนที่จะลดลง
        </p>
      ) : null}

      <dl className="mt-3 space-y-2 text-sm">
        <Row label="ค่างวดต่อเดือน" value={formatBaht(monthlyPayment)} emphasis />
        <Row label="ดอกเบี้ยรวม" value={formatBaht(totalInterest)} />
        <Row label="จ่ายจริงทั้งหมด" value={formatBaht(totalPaid)} />
        <Row label="ระยะเวลาผ่อน" value={formatDuration(monthsToPayoff)} />
      </dl>
    </div>
  )
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="ink">{label}</dt>
      <dd className={emphasis ? 'ink-strong font-semibold' : 'ink-strong'}>{value}</dd>
    </div>
  )
}
