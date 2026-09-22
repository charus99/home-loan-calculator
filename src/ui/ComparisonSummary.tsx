import type { RefinanceComparison } from '../core/types'
import { formatBaht, formatDuration } from './format'

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

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <LoanTotals
          title="สินเชื่อปัจจุบัน"
          monthlyPayment={current.rows[0].payment}
          totalInterest={current.totalInterest}
          totalPaid={current.totalPaid}
          monthsToPayoff={current.monthsToPayoff}
          hasNegativeAmortization={current.hasNegativeAmortization}
        />
        <LoanTotals
          title="ทางเลือกใหม่"
          monthlyPayment={alternative.rows[0].payment}
          totalInterest={alternative.totalInterest}
          totalPaid={alternative.totalPaid}
          monthsToPayoff={alternative.monthsToPayoff}
          hasNegativeAmortization={alternative.hasNegativeAmortization}
        />
      </div>

      <div
        className={`rounded-xl border p-5 ${
          worthwhile ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'
        }`}
      >
        <h2 className="text-lg font-semibold text-slate-900">
          {worthwhile ? 'คุ้มที่จะเปลี่ยน' : 'ยังไม่คุ้มที่จะเปลี่ยน'}
        </h2>
        <p className="sr-only">
          สรุปผลการเปรียบเทียบระหว่างสินเชื่อปัจจุบันกับทางเลือกใหม่
        </p>

        {cheaperMonthlyButCostlier ? (
          <p className="mt-2 rounded bg-white/70 p-3 text-sm text-amber-900">
            <strong>ระวัง:</strong> ค่างวดต่อเดือนถูกลงก็จริง
            แต่ดอกเบี้ยรวมตลอดสัญญาแพงกว่าเดิม เพราะค่างวดถูกตั้งจากอัตราโปรโมชัน
            พอหมดโปรฯ ค่างวดเท่าเดิมจะตัดเงินต้นได้น้อยลง
          </p>
        ) : null}

        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-slate-600">ดอกเบี้ยที่ประหยัดได้</dt>
            <dd className="text-xl font-semibold text-slate-900">
              {formatBaht(grossInterestSaved)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600">หักค่าใช้จ่าย</dt>
            <dd className="text-xl font-semibold text-slate-900">−{formatBaht(totalCosts)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600">ประหยัดสุทธิ</dt>
            <dd
              className={`text-2xl font-bold ${
                worthwhile ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {formatBaht(netSaving)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-sm text-slate-700">
          {comparison.breakEvenMonth === null ? (
            'ไม่มีจุดคุ้มทุน — ทางเลือกนี้ไม่คืนทุนตลอดอายุสัญญา'
          ) : (
            <>
              ค่าใช้จ่ายคืนทุนในเดือนที่ <strong>{comparison.breakEvenMonth}</strong> (
              {formatDuration(comparison.breakEvenMonth)})
            </>
          )}
          {comparison.monthsSaved !== 0 ? (
            <>
              {' · '}
              {comparison.monthsSaved > 0 ? 'หมดหนี้เร็วขึ้น ' : 'หมดหนี้ช้าลง '}
              <strong>{formatDuration(Math.abs(comparison.monthsSaved))}</strong>
            </>
          ) : null}
        </p>
      </div>
    </section>
  )
}

interface LoanTotalsProps {
  title: string
  monthlyPayment: number
  totalInterest: number
  totalPaid: number
  monthsToPayoff: number
  hasNegativeAmortization: boolean
}

function LoanTotals({
  title,
  monthlyPayment,
  totalInterest,
  totalPaid,
  monthsToPayoff,
  hasNegativeAmortization,
}: LoanTotalsProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>

      {hasNegativeAmortization ? (
        <p role="alert" className="mt-2 rounded bg-red-50 p-2 text-sm text-red-800">
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
      <dt className="text-slate-600">{label}</dt>
      <dd className={emphasis ? 'font-semibold text-slate-900' : 'text-slate-900'}>{value}</dd>
    </div>
  )
}
