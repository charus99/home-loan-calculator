import { estimateMortgageRegistration, totalRefinanceCosts } from '../core/refinance'
import type { RefinanceCosts } from '../core/types'
import { formatBaht } from './format'

interface CostsFormProps {
  costs: RefinanceCosts
  onChange: (costs: RefinanceCosts) => void
  /** Facility amount, used to offer the conventional 1% registration fee. */
  loanAmount: number
}

const FIELDS: Array<{ key: keyof RefinanceCosts; label: string; help?: string }> = [
  {
    key: 'mortgageRegistration',
    label: 'ค่าจดจำนอง',
    help: 'ปกติ 1% ของวงเงิน',
  },
  { key: 'appraisal', label: 'ค่าประเมินราคา' },
  { key: 'stampDuty', label: 'ค่าอากรแสตมป์' },
  { key: 'insurance', label: 'ประกันอัคคีภัย / MRTA' },
  {
    key: 'prepaymentPenalty',
    label: 'ค่าปรับไถ่ถอนก่อนกำหนด',
    help: 'มักคิดเมื่อรีไฟแนนซ์ก่อนครบ 3 ปี',
  },
  { key: 'other', label: 'ค่าใช้จ่ายอื่น' },
]

/**
 * Inputs for the one-off costs of refinancing.
 *
 * These decide whether a lower rate is actually worth taking, so they sit
 * alongside the loan inputs rather than behind a disclosure.
 */
export function CostsForm({ costs, onChange, loanAmount }: CostsFormProps) {
  const total = totalRefinanceCosts(costs)
  const suggestedRegistration = estimateMortgageRegistration(loanAmount)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">ค่าใช้จ่ายในการรีไฟแนนซ์</h2>
      <p className="mt-1 text-sm text-slate-500">
        ค่าใช้จ่ายเหล่านี้ถูกหักออกจากดอกเบี้ยที่ประหยัดได้ ก่อนสรุปว่าคุ้มหรือไม่
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FIELDS.map(({ key, label, help }) => (
          <label key={key} className="block">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            <input
              type="number"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-right"
              value={costs[key] ?? 0}
              min={0}
              step={1_000}
              onChange={(event) => onChange({ ...costs, [key]: Number(event.target.value) })}
            />
            {key === 'mortgageRegistration' && costs[key] !== suggestedRegistration ? (
              <button
                type="button"
                className="mt-1 text-xs text-blue-600 hover:underline"
                onClick={() => onChange({ ...costs, mortgageRegistration: suggestedRegistration })}
              >
                ใช้ {formatBaht(suggestedRegistration)} (1% ของวงเงิน)
              </button>
            ) : help ? (
              <span className="mt-1 block text-xs text-slate-500">{help}</span>
            ) : null}
          </label>
        ))}
      </div>

      <p className="mt-4 border-t border-slate-200 pt-3 text-right text-sm text-slate-700">
        รวมค่าใช้จ่าย <strong className="text-base">{formatBaht(total)}</strong>
      </p>
    </section>
  )
}
