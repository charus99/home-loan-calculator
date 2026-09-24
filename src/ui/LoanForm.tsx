import { useState } from 'react'
import type { LoanTerms, RateTier } from '../core/types'
import { formatBaht, formatDuration } from './format'

interface LoanFormProps {
  title: string
  terms: LoanTerms
  onChange: (terms: LoanTerms) => void
  /** Rendered under the title, e.g. to explain what this column represents. */
  hint?: string
  /**
   * How the instalment field behaves in this column.
   *
   * 'required' is the current loan: the borrower reads the figure off their
   * statement. 'optional' is an alternative offer, where leaving it blank
   * compares at the current loan's instalment — which keeps a lower rate
   * showing up as a shorter term rather than as a smaller payment. A lender's
   * quoted instalment can be entered instead.
   */
  paymentField: 'required' | 'optional'
  /** The instalment used when this column's own field is blank. */
  inheritedPayment?: number
  /** Months until payoff, computed from the inputs, shown back as feedback. */
  monthsToPayoff?: number
}

/**
 * One column of the comparison: the inputs describing a single loan.
 */
export function LoanForm({
  title,
  terms,
  onChange,
  hint,
  paymentField,
  inheritedPayment,
  monthsToPayoff,
}: LoanFormProps) {
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
    <section className="panel p-5">
      <h2 className="ink-strong text-lg font-semibold">{title}</h2>
      {hint ? <p className="ink-muted mt-1 text-sm">{hint}</p> : null}

      <div className="mt-4 space-y-4">
        <NumberField
          label="เงินต้นคงเหลือ"
          suffix="บาท"
          value={terms.principal}
          decimals={2}
          onChange={(principal) => onChange({ ...terms, principal })}
        />

        <NumberField
          label="ค่างวดต่อเดือน"
          suffix="บาท"
          // An optional field shows empty rather than 0 when unset, so it reads
          // as "not entered" rather than as a payment of nothing.
          value={terms.monthlyPayment ?? (paymentField === 'optional' ? null : 0)}
          decimals={2}
          onChange={(monthlyPayment) =>
            onChange({
              ...terms,
              // Zero means "not entered" for an optional field, so the column
              // falls back to the inherited instalment rather than refusing
              // to calculate.
              monthlyPayment:
                paymentField === 'optional' && monthlyPayment === 0 ? undefined : monthlyPayment,
            })
          }
          help={
            paymentField === 'required'
              ? 'ยอดที่ธนาคารเรียกเก็บ ดูได้จากใบแจ้งหนี้'
              : inheritedPayment
                ? `เว้นว่างไว้เพื่อเทียบที่ค่างวดเดิม ${formatBaht(inheritedPayment)}`
                : 'เว้นว่างไว้เพื่อเทียบที่ค่างวดเดิม'
          }
        />

        <fieldset>
          <legend className="ink text-sm font-medium">
            อัตราดอกเบี้ยแบบขั้นบันได
          </legend>
          <div className="mt-2 space-y-2">
            {terms.rateTiers.map((tier, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="ink w-20 shrink-0 text-sm">
                  {index === 0 ? 'ตั้งแต่เดือน' : 'เดือนที่'}
                </span>
                <input
                  type="number"
                  aria-label={`ช่วงที่ ${index + 1} เริ่มเดือนที่`}
                  className="field w-20 px-2 py-1 text-right"
                  value={tier.fromMonth}
                  min={1}
                  disabled={index === 0}
                  onChange={(event) =>
                    updateTier(index, { fromMonth: Number(event.target.value) })
                  }
                />
                <RateInput
                  label={`ช่วงที่ ${index + 1} อัตราดอกเบี้ย`}
                  value={tier.annualRatePercent}
                  onChange={(annualRatePercent) => updateTier(index, { annualRatePercent })}
                />
                <span className="ink text-sm">%</span>
                {terms.rateTiers.length > 1 && index > 0 ? (
                  <button
                    type="button"
                    onClick={() => removeTier(index)}
                    aria-label={`ลบช่วงที่ ${index + 1}`}
                    className="ink-muted ml-auto rounded px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
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
            className="field ink mt-2 px-3 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            + เพิ่มช่วงอัตราดอกเบี้ย
          </button>
        </fieldset>

        <NumberField
          label="โปะเพิ่มต่อเดือน"
          suffix="บาท"
          value={terms.extraMonthlyPayment ?? 0}
          decimals={2}
          onChange={(extraMonthlyPayment) => onChange({ ...terms, extraMonthlyPayment })}
          help="ใส่ 0 ถ้าไม่โปะ"
        />

        {paymentField === 'optional' && !terms.monthlyPayment ? (
          <p className="ink-muted text-xs">
            กำลังเทียบด้วยค่างวดเท่ากับสินเชื่อปัจจุบัน ดอกเบี้ยที่ถูกลงจะไปตัดเงินต้นมากขึ้น
            จึงหมดหนี้เร็วกว่า
          </p>
        ) : null}
      </div>

      <p className="ink hairline mt-4 border-t pt-3 text-sm">
        {monthsToPayoff === undefined ? (
          <span className="ink-muted">กดคำนวณเพื่อดูว่าหมดหนี้เมื่อไหร่</span>
        ) : (
          <>
            หมดหนี้ใน <strong className="ink-strong">{formatDuration(monthsToPayoff)}</strong>
          </>
        )}
      </p>
    </section>
  )
}

/**
 * The rate for one tier, to two decimal places.
 *
 * Thai lenders quote rates like 6.25% or MRR-2.13%, so a step attribute that
 * snapped to 0.05 would reject figures taken straight off an offer sheet.
 */
function RateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      className="field w-24 px-2 py-1 text-right"
      value={draft ?? String(value)}
      onChange={(event) => {
        const text = event.target.value
        if (text !== '' && !/^\d*\.?\d{0,2}$/.test(text)) {
          return
        }
        setDraft(text)
        const parsed = Number(text)
        if (text === '') {
          onChange(0)
        } else if (Number.isFinite(parsed) && parsed <= 100) {
          onChange(parsed)
        }
      }}
      onBlur={() => setDraft(null)}
    />
  )
}

interface NumberFieldProps {
  label: string
  /** null renders an empty field, for an optional amount that is not set. */
  value: number | null
  onChange: (value: number) => void
  suffix?: string
  help?: string
  /** Decimal places accepted. Omitted means whole numbers only. */
  decimals?: number
}

function NumberField({ label, value, onChange, suffix, help, decimals = 0 }: NumberFieldProps) {
  // Held as text while the field has focus. A controlled number would rewrite
  // "17110." back to "17110" as soon as the decimal point is typed, making a
  // fractional amount impossible to enter; it would also expand a value the
  // migration computed to its full twelve decimals.
  const [draft, setDraft] = useState<string | null>(null)

  const accepts = (text: string) => {
    if (text === '') {
      return true
    }
    const pattern = decimals > 0 ? new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`) : /^\d*$/
    return pattern.test(text)
  }

  return (
    <label className="block">
      <span className="ink text-sm font-medium">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          className="field w-full px-3 py-2 text-right"
          value={draft ?? (value === null ? '' : String(value))}
          onChange={(event) => {
            const text = event.target.value
            if (!accepts(text)) {
              return
            }
            setDraft(text)
            // An empty or partial entry ("17110.") is not a number yet; the
            // previous value stands until it becomes one.
            const parsed = Number(text)
            if (text !== '' && Number.isFinite(parsed)) {
              onChange(parsed)
            } else if (text === '') {
              onChange(0)
            }
          }}
          onBlur={() => setDraft(null)}
        />
        {suffix ? <span className="ink shrink-0 text-sm">{suffix}</span> : null}
      </span>
      {help ? <span className="ink-muted mt-1 block text-xs">{help}</span> : null}
    </label>
  )
}
