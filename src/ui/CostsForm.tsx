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
    <section className="panel p-5">
      <h2 className="ink-strong text-lg font-semibold">ค่าใช้จ่ายในการรีไฟแนนซ์</h2>
      <p className="ink-muted mt-1 text-sm">
        ค่าใช้จ่ายเหล่านี้ถูกหักออกจากดอกเบี้ยที่ประหยัดได้ ก่อนสรุปว่าคุ้มหรือไม่
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FIELDS.map(({ key, label, help }) => (
          <label key={key} className="block">
            <span className="ink text-sm font-medium">{label}</span>
            <input
              type="number"
              className="field mt-1 w-full px-3 py-2 text-right"
              value={costs[key] ?? 0}
              min={0}
              step={1_000}
              onChange={(event) => onChange({ ...costs, [key]: Number(event.target.value) })}
            />
            {key === 'mortgageRegistration' && costs[key] !== suggestedRegistration ? (
              <button
                type="button"
                className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                onClick={() => onChange({ ...costs, mortgageRegistration: suggestedRegistration })}
              >
                ใช้ {formatBaht(suggestedRegistration)} (1% ของวงเงิน)
              </button>
            ) : help ? (
              <span className="ink-muted mt-1 block text-xs">{help}</span>
            ) : null}
          </label>
        ))}
      </div>

      <p className="hairline ink mt-4 border-t pt-3 text-right text-sm">
        รวมค่าใช้จ่าย <strong className="text-base">{formatBaht(total)}</strong>
      </p>
    </section>
  )
}
