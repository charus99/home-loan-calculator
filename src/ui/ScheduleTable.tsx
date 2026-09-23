import { useState } from 'react'
import type { Schedule } from '../core/types'
import { formatBahtPrecise, formatRate } from './format'

interface ScheduleTableProps {
  schedule: Schedule
  title: string
}

const INITIAL_ROWS = 12

/**
 * The full payment schedule, month by month.
 *
 * Also serves as the non-visual route to the same data the charts show, which
 * the colour guidance requires wherever a series sits below the contrast bar.
 */
export function ScheduleTable({ schedule, title }: ScheduleTableProps) {
  const [expanded, setExpanded] = useState(false)
  const rows = expanded ? schedule.rows : schedule.rows.slice(0, INITIAL_ROWS)

  return (
    <section className="panel p-5">
      <h3 className="ink-strong font-semibold">{title}</h3>

      <div className="mt-3 overflow-x-auto">
        <table className="ink-strong w-full text-right text-sm tabular-nums">
          <thead>
            <tr className="hairline ink border-b">
              <th scope="col" className="py-2 pr-3 text-left font-medium">งวด</th>
              <th scope="col" className="py-2 pr-3 font-medium">อัตรา</th>
              <th scope="col" className="py-2 pr-3 font-medium">ค่างวด</th>
              <th scope="col" className="py-2 pr-3 font-medium">ดอกเบี้ย</th>
              <th scope="col" className="py-2 pr-3 font-medium">เงินต้น</th>
              <th scope="col" className="py-2 font-medium">คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.month}
                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
              >
                <th scope="row" className="ink py-1.5 pr-3 text-left font-normal">
                  {row.month}
                </th>
                <td className="ink py-1.5 pr-3">
                  {formatRate(row.annualRatePercent)}
                </td>
                <td className="py-1.5 pr-3">{formatBahtPrecise(row.payment)}</td>
                <td className="py-1.5 pr-3">{formatBahtPrecise(row.interest)}</td>
                <td className="py-1.5 pr-3">{formatBahtPrecise(row.principal)}</td>
                <td className="py-1.5 font-medium">{formatBahtPrecise(row.balance)}</td>
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
          {expanded
            ? 'ย่อ'
            : `ดูทั้งหมด ${schedule.rows.length} งวด`}
        </button>
      ) : null}
    </section>
  )
}
