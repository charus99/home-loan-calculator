import { buildSchedule } from '../core/amortization'
import { formatBaht } from './format'

/**
 * Placeholder screen that proves the calculation core, Tailwind and the build
 * all work together. The real two-column comparison replaces this next.
 */
export default function App() {
  const schedule = buildSchedule({
    principal: 2_400_000,
    rateTiers: [
      { fromMonth: 1, annualRatePercent: 3 },
      { fromMonth: 37, annualRatePercent: 6.5 },
    ],
    termMonths: 360,
    startDate: new Date(2026, 0, 15),
  })

  const firstPayment = schedule.rows[0]

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">คำนวณสินเชื่อบ้าน</h1>
      <p className="mt-2 text-slate-600">
        ตัวอย่างการคำนวณ — วงเงิน 2,400,000 บาท ปี 1-3 ดอกเบี้ย 3% ปี 4 เป็นต้นไป 6.5%
        ระยะเวลา 30 ปี
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-4">
        <Stat label="ค่างวดต่อเดือน" value={formatBaht(firstPayment.payment)} />
        <Stat label="ดอกเบี้ยงวดแรก" value={formatBaht(firstPayment.interest)} />
        <Stat label="ดอกเบี้ยรวมทั้งสัญญา" value={formatBaht(schedule.totalInterest)} />
        <Stat label="จ่ายจริงทั้งหมด" value={formatBaht(schedule.totalPaid)} />
      </dl>

      <p className="mt-8 text-sm text-slate-500">
        ยังเป็นหน้าตัวอย่าง ฟอร์มกรอกข้อมูลและกราฟเปรียบเทียบจะตามมา
      </p>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-slate-900">{value}</dd>
    </div>
  )
}
