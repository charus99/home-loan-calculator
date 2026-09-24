import { useState } from 'react'
import type { Schedule, ScheduleRow } from '../core/types'
import { chartTheme } from './chartTheme'
import { formatBahtPrecise, formatRate, formatThaiDate } from './format'
import { useTheme } from './ThemeContext'

interface ScheduleTableProps {
  schedule: Schedule
  title: string
  /** The loan's chart colour, so the table reads as belonging to it. */
  accentColor: string
}

const INITIAL_ROWS = 12

/**
 * The full payment schedule, month by month.
 *
 * Each row shows where that month's payment went: how much the lender kept as
 * interest and how much reduced the debt, with the extra payment called out
 * and a bar for the proportion. The date and day count are there so a row can
 * be checked against a bank statement, and so the month-to-month swing in
 * interest — which follows the length of each period — explains itself.
 *
 * Also serves as the non-visual route to the same data the charts show, which
 * the colour guidance requires wherever a series sits below the contrast bar.
 */
export function ScheduleTable({ schedule, title, accentColor }: ScheduleTableProps) {
  const [expanded, setExpanded] = useState(false)
  const rows = expanded ? schedule.rows : schedule.rows.slice(0, INITIAL_ROWS)
  const colors = chartTheme(useTheme()).paymentSplit
  // Named above the table because the lump often lands past the rows shown
  // before the table is expanded.
  const lumpRows = schedule.rows.filter((row) => row.lumpPaid > 0)

  return (
    // min-w-0: as a grid item this would otherwise grow to the table's full
    // width and push the page sideways on a phone, instead of letting the
    // table scroll inside its own box.
    <section className="panel min-w-0 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="ink-strong flex items-center gap-2 font-semibold">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          {title}
        </h3>
        <p className="ink-muted flex items-center gap-4 text-xs">
          <Swatch color={colors.interest} label="ดอกเบี้ย" />
          <Swatch color={colors.principal} label="ตัดเงินต้น" />
        </p>
      </div>

      {lumpRows.map((row) => (
        <p key={row.month} className="mt-2 text-sm text-amber-700 dark:text-amber-300">
          โปะเงินก้อน {formatBahtPrecise(row.lumpPaid)} ในงวดที่ {row.month} (
          {formatThaiDate(row.date)})
        </p>
      ))}

      <div className="mt-3 overflow-x-auto">
        <table className="ink-strong w-full min-w-[46rem] text-right text-sm tabular-nums">
          <thead>
            <tr className="hairline ink border-b">
              <th scope="col" className="py-2 pr-3 text-left font-medium">งวด</th>
              <th scope="col" className="py-2 pr-3 text-left font-medium">วันที่</th>
              <th scope="col" className="py-2 pr-3 font-medium">วัน</th>
              <th scope="col" className="py-2 pr-3 font-medium">อัตรา</th>
              <th scope="col" className="py-2 pr-3 font-medium">จ่าย</th>
              <th scope="col" className="py-2 pr-3 font-medium">ดอกเบี้ย</th>
              <th scope="col" className="py-2 pr-3 font-medium">ตัดเงินต้น</th>
              <th scope="col" className="py-2 font-medium">คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.month}
                className={`border-b border-slate-100 align-top last:border-0 dark:border-slate-800 ${
                  // The month a lump sum lands is the one worth finding.
                  row.lumpPaid > 0 ? 'bg-amber-50 dark:bg-amber-950/40' : ''
                }`}
              >
                <th scope="row" className="ink py-2 pr-3 text-left font-normal">
                  {row.month}
                </th>
                <td className="ink whitespace-nowrap py-2 pr-3 text-left">
                  {formatThaiDate(row.date)}
                </td>
                <td className="ink py-2 pr-3">{row.days}</td>
                <td className="ink py-2 pr-3">{formatRate(row.annualRatePercent)}</td>
                <td className="py-2 pr-3">
                  {formatBahtPrecise(row.payment)}
                  <SplitBar row={row} colors={colors} />
                </td>
                <td className="py-2 pr-3">{formatBahtPrecise(row.interest)}</td>
                <td className="py-2 pr-3">
                  {formatBahtPrecise(row.principal)}
                  {row.extraPaid > 0 ? (
                    <span className="ink-muted block text-xs">
                      รวมโปะ {formatBahtPrecise(row.extraPaid)}
                    </span>
                  ) : null}
                  {row.lumpPaid > 0 ? (
                    <span className="block text-xs font-semibold text-amber-700 dark:text-amber-300">
                      รวมโปะก้อน {formatBahtPrecise(row.lumpPaid)}
                    </span>
                  ) : null}
                </td>
                <td className="py-2 font-semibold">{formatBahtPrecise(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {schedule.rows.length > INITIAL_ROWS ? (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="field ink mt-3 px-3 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {expanded ? 'ย่อ' : `ดูทั้งหมด ${schedule.rows.length} งวด`}
        </button>
      ) : null}
    </section>
  )
}

/**
 * How one payment divided between interest and principal, as a thin bar.
 *
 * Decorative: the two amounts sit in their own columns beside it, so the bar
 * adds the proportion at a glance without being the only place it is stated.
 */
function SplitBar({
  row,
  colors,
}: {
  row: ScheduleRow
  colors: { interest: string; principal: string }
}) {
  if (row.payment <= 0) {
    return null
  }
  // A payment smaller than its interest leaves nothing for principal; clamp
  // so the bar never draws a negative width.
  const interestShare = Math.min(1, Math.max(0, row.interest / row.payment))

  return (
    <span
      aria-hidden="true"
      className="mt-1 ml-auto flex h-1.5 w-24 gap-px overflow-hidden rounded-full"
    >
      <span style={{ width: `${interestShare * 100}%`, backgroundColor: colors.interest }} />
      <span style={{ flex: 1, backgroundColor: colors.principal }} />
    </span>
  )
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
