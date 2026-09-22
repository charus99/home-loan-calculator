import type { LoanTerms, RateTier } from '../core/types'
import { formatRate } from './format'

interface LoanFormProps {
  title: string
  terms: LoanTerms
  onChange: (terms: LoanTerms) => void
  /** Rendered under the title, e.g. to explain what this column represents. */
  hint?: string
}

/**
 * One column of the comparison: the inputs describing a single loan.
 *
 * Numbers are held as strings while typing so that clearing a field does not
 * snap it back to zero mid-edit.
 */
export function LoanForm({ title, terms, onChange, hint }: LoanFormProps) {
  const updateTier = (index: number, patch: Partial<RateTier>) => {
    const rateTiers = terms.rateTiers.map((tier, i) =>
      i === index ? { ...tier, ...patch } : tier,
    )
    onChange({ ...terms, rateTiers })
  }

  const addTier = () => {
    const last = terms.rateTiers[terms.rateTiers.length - 1]
    onChange({
      ...terms,
      rateTiers: [
        ...terms.rateTiers,
        { fromMonth: last.fromMonth + 36, annualRatePercent: last.annualRatePercent + 3 },
      ],
    })
  }

  const removeTier = (index: number) => {
    onChange({ ...terms, rateTiers: terms.rateTiers.filter((_, i) => i !== index) })
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}

      <div className="mt-4 space-y-4">
        <NumberField
          label="เงินต้นคงเหลือ"
          suffix="บาท"
          value={terms.principal}
          min={1}
          step={10_000}
          onChange={(principal) => onChange({ ...terms, principal })}
        />

        <NumberField
          label="ระยะเวลาที่เหลือ"
          suffix="เดือน"
          value={terms.termMonths}
          min={1}
          step={12}
          onChange={(termMonths) => onChange({ ...terms, termMonths })}
          help={`${(terms.termMonths / 12).toFixed(1)} ปี`}
        />

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">
            อัตราดอกเบี้ยแบบขั้นบันได
          </legend>
          <div className="mt-2 space-y-2">
            {terms.rateTiers.map((tier, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-sm text-slate-600">
                  {index === 0 ? 'ตั้งแต่เดือน' : 'เดือนที่'}
                </span>
                <input
                  type="number"
                  aria-label={`ช่วงที่ ${index + 1} เริ่มเดือนที่`}
                  className="w-20 rounded border border-slate-300 px-2 py-1 text-right"
                  value={tier.fromMonth}
                  min={1}
                  disabled={index === 0}
                  onChange={(event) =>
                    updateTier(index, { fromMonth: Number(event.target.value) })
                  }
                />
                <input
                  type="number"
                  aria-label={`ช่วงที่ ${index + 1} อัตราดอกเบี้ย`}
                  className="w-24 rounded border border-slate-300 px-2 py-1 text-right"
                  value={tier.annualRatePercent}
                  min={0}
                  max={100}
                  step={0.05}
                  onChange={(event) =>
                    updateTier(index, { annualRatePercent: Number(event.target.value) })
                  }
                />
                <span className="text-sm text-slate-600">%</span>
                {terms.rateTiers.length > 1 && index > 0 ? (
                  <button
                    type="button"
                    onClick={() => removeTier(index)}
                    aria-label={`ลบช่วงที่ ${index + 1}`}
                    className="ml-auto rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
                  >
                    ลบ
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addTier}
            className="mt-2 rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            + เพิ่มช่วงอัตราดอกเบี้ย
          </button>
        </fieldset>

        <NumberField
          label="โปะเพิ่มต่อเดือน"
          suffix="บาท"
          value={terms.extraMonthlyPayment ?? 0}
          min={0}
          step={1_000}
          onChange={(extraMonthlyPayment) => onChange({ ...terms, extraMonthlyPayment })}
          help="ใส่ 0 ถ้าไม่โปะ"
        />
      </div>

      <p className="mt-4 text-xs text-slate-400">
        อัตราปัจจุบัน {formatRate(terms.rateTiers[0].annualRatePercent)}
      </p>
    </section>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  suffix?: string
  help?: string
  min?: number
  max?: number
  step?: number
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  help,
  min,
  max,
  step,
}: NumberFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input
          type="number"
          className="w-full rounded border border-slate-300 px-3 py-2 text-right"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix ? <span className="shrink-0 text-sm text-slate-600">{suffix}</span> : null}
      </span>
      {help ? <span className="mt-1 block text-xs text-slate-500">{help}</span> : null}
    </label>
  )
}
