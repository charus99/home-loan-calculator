import { useState, type ReactNode } from 'react'

const groupedFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/** 2400000 → "2,400,000"; 17110.5 → "17,110.5". */
function formatGrouped(value: number): string {
  return groupedFormatter.format(value)
}

interface NumberFieldProps {
  label: string
  /** null renders an empty field, for an optional amount that is not set. */
  value: number | null
  onChange: (value: number) => void
  suffix?: string
  help?: string
  /**
   * Content placed under the field but outside its label — for a control such
   * as a suggestion button, which must not sit inside the label it belongs to.
   */
  below?: ReactNode
  /** Decimal places accepted. Omitted means whole numbers only. */
  decimals?: number
}

/**
 * A money amount: grouped with commas at rest, bare digits while typing.
 *
 * Shared by every amount on the page so they all read and behave alike.
 */
export function NumberField({
  label,
  value,
  onChange,
  suffix,
  help,
  below,
  decimals = 0,
}: NumberFieldProps) {
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
    <div>
      <label className="block">
        <span className="ink text-sm font-medium">{label}</span>
        <span className="mt-1 flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            className="field w-full px-3 py-2 text-right tabular-nums"
            // Grouped with commas when at rest so a seven-digit amount can be
            // read at a glance; bare digits while typing, because inserting
            // separators mid-entry moves the caret under the visitor's fingers.
            value={draft ?? (value === null ? '' : formatGrouped(value))}
            onFocus={() => setDraft(value === null ? '' : String(value))}
            onChange={(event) => {
              // Commas are accepted so a figure pasted from a statement works.
              const text = event.target.value.replace(/,/g, '')
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
      {below}
    </div>
  )
}
