import { estimateMortgageRegistration, totalRefinanceCosts } from '../core/refinance'
import type { RefinanceCosts } from '../core/types'
import { formatBaht } from './format'
import { NumberField } from './NumberField'

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
      {/* Visually carried by the step label above; kept for the outline a
          screen reader navigates by. */}
      <h2 className="sr-only">ค่าใช้จ่ายในการรีไฟแนนซ์</h2>
      <p className="ink-muted text-sm">
        ค่าใช้จ่ายเหล่านี้ถูกหักออกจากดอกเบี้ยที่ประหยัดได้ ก่อนสรุปว่าคุ้มหรือไม่
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FIELDS.map(({ key, label, help }) => {
          const offerSuggestion =
            key === 'mortgageRegistration' && costs[key] !== suggestedRegistration

          return (
            <NumberField
              key={key}
              label={label}
              suffix="บาท"
              value={costs[key] ?? 0}
              decimals={2}
              onChange={(amount) => onChange({ ...costs, [key]: amount })}
              help={offerSuggestion ? undefined : help}
              below={
                offerSuggestion ? (
                  <button
                    type="button"
                    className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                    onClick={() =>
                      onChange({ ...costs, mortgageRegistration: suggestedRegistration })
                    }
                  >
                    ใช้ {formatBaht(suggestedRegistration)} (1% ของวงเงิน)
                  </button>
                ) : null
              }
            />
          )
        })}
      </div>

      <p className="hairline ink mt-4 border-t pt-3 text-right text-sm">
        รวมค่าใช้จ่าย <strong className="text-base">{formatBaht(total)}</strong>
      </p>
    </section>
  )
}
