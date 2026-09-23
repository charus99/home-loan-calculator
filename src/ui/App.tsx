import { useMemo } from 'react'
import { compareRefinance } from '../core/refinance'
import { validateRateTiers } from '../core/interest'
import type { LoanTerms, RefinanceCosts } from '../core/types'
import { BalanceChart } from './charts/BalanceChart'
import { BreakEvenChart } from './charts/BreakEvenChart'
import { PaymentSplitChart } from './charts/PaymentSplitChart'
import { ComparisonSummary } from './ComparisonSummary'
import { CostsForm } from './CostsForm'
import { LoanForm } from './LoanForm'
import { ScheduleTable } from './ScheduleTable'
import { useStoredState } from './useStoredState'

/** Someone part way through a loan at the post-promotional rate. */
const DEFAULT_CURRENT: LoanTerms = {
  principal: 2_400_000,
  rateTiers: [{ fromMonth: 1, annualRatePercent: 6.5 }],
  termMonths: 264,
  extraMonthlyPayment: 0,
}

/**
 * A refinancing offer that is genuinely cheaper: promotional years followed by
 * a rate still below the current one, over the same remaining term.
 */
const DEFAULT_ALTERNATIVE: LoanTerms = {
  principal: 2_400_000,
  rateTiers: [
    { fromMonth: 1, annualRatePercent: 3 },
    { fromMonth: 37, annualRatePercent: 4.75 },
  ],
  termMonths: 264,
  extraMonthlyPayment: 0,
}

const DEFAULT_COSTS: RefinanceCosts = {
  mortgageRegistration: 24_000,
  appraisal: 3_000,
  stampDuty: 1_200,
  insurance: 0,
  prepaymentPenalty: 0,
  other: 0,
}

/** JSON has no Date, so a stored startDate comes back as a string. */
function reviveLoanTerms(fallback: LoanTerms) {
  return (parsed: unknown): LoanTerms => {
    if (typeof parsed !== 'object' || parsed === null) {
      return fallback
    }
    const terms = parsed as LoanTerms & { startDate?: string }
    if (!Array.isArray(terms.rateTiers) || terms.rateTiers.length === 0) {
      return fallback
    }
    return {
      ...terms,
      startDate: terms.startDate ? new Date(terms.startDate) : undefined,
    }
  }
}

export default function App() {
  const [currentLoan, setCurrentLoan] = useStoredState(
    'home-loan:current',
    DEFAULT_CURRENT,
    reviveLoanTerms(DEFAULT_CURRENT),
  )
  const [alternativeLoan, setAlternativeLoan] = useStoredState(
    'home-loan:alternative',
    DEFAULT_ALTERNATIVE,
    reviveLoanTerms(DEFAULT_ALTERNATIVE),
  )
  const [costs, setCosts] = useStoredState('home-loan:costs', DEFAULT_COSTS)

  const problems = useMemo(
    () => [
      ...validateRateTiers(currentLoan.rateTiers).map((p) => `สินเชื่อปัจจุบัน: ${p}`),
      ...validateRateTiers(alternativeLoan.rateTiers).map((p) => `ทางเลือกใหม่: ${p}`),
    ],
    [currentLoan.rateTiers, alternativeLoan.rateTiers],
  )

  const comparison = useMemo(() => {
    if (problems.length > 0) {
      return null
    }
    try {
      return compareRefinance(currentLoan, alternativeLoan, costs)
    } catch (error) {
      // A schedule can refuse to build on inputs the tier check does not cover,
      // such as a zero principal. Surfacing it beats rendering a blank page.
      return error instanceof Error ? error : new Error('คำนวณไม่สำเร็จ')
    }
  }, [currentLoan, alternativeLoan, costs, problems])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <header>
          <h1 className="ink-strong text-3xl font-bold">คำนวณสินเชื่อบ้าน</h1>
          <p className="ink mt-2">
            เปรียบเทียบสินเชื่อปัจจุบันกับทางเลือกใหม่ ดอกเบี้ยลดต้นรายวันแบบธนาคารไทย
          </p>
        </header>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <LoanForm
            title="สินเชื่อปัจจุบัน"
            hint="กรอกยอดคงเหลือและอัตราที่จ่ายอยู่ตอนนี้"
            terms={currentLoan}
            onChange={setCurrentLoan}
          />
          <LoanForm
            title="ทางเลือกใหม่"
            hint="ข้อเสนอรีไฟแนนซ์ หรือของธนาคารอีกเจ้า"
            terms={alternativeLoan}
            onChange={setAlternativeLoan}
          />
        </div>

        <div className="mt-4">
          <CostsForm costs={costs} onChange={setCosts} loanAmount={alternativeLoan.principal} />
        </div>

        {problems.length > 0 ? (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-300 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950"
          >
            <h2 className="font-semibold text-red-900 dark:text-red-200">
              ตรวจสอบข้อมูลที่กรอก
            </h2>
            <ul className="mt-2 list-inside list-disc text-sm text-red-800 dark:text-red-300">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        ) : comparison instanceof Error ? (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-300 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950"
          >
            <h2 className="font-semibold text-red-900 dark:text-red-200">คำนวณไม่สำเร็จ</h2>
            <p className="mt-1 text-sm text-red-800 dark:text-red-300">{comparison.message}</p>
          </div>
        ) : comparison ? (
          <>
            <div className="mt-8">
              <ComparisonSummary comparison={comparison} />
            </div>

            <div className="mt-4 space-y-4">
              <BalanceChart
                current={comparison.current}
                alternative={comparison.alternative}
              />
              <BreakEvenChart comparison={comparison} />
              <div className="grid gap-4 lg:grid-cols-2">
                <PaymentSplitChart
                  schedule={comparison.current}
                  title="สัดส่วนการจ่าย — ปัจจุบัน"
                />
                <PaymentSplitChart
                  schedule={comparison.alternative}
                  title="สัดส่วนการจ่าย — ทางเลือกใหม่"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ScheduleTable schedule={comparison.current} title="ตารางผ่อน — ปัจจุบัน" />
              <ScheduleTable
                schedule={comparison.alternative}
                title="ตารางผ่อน — ทางเลือกใหม่"
              />
            </div>
          </>
        ) : null}

        <footer className="hairline ink-muted mt-10 border-t pt-6 text-sm">
          <p>
            ตัวเลขนี้ยังไม่ได้เทียบกับตารางผ่อนจริงของธนาคาร
            ใช้ประกอบการตัดสินใจได้ แต่อย่าถือเป็นตัวเลขทางการ
          </p>
          <p className="mt-1">ข้อมูลที่กรอกเก็บไว้ในเบราว์เซอร์นี้เท่านั้น ไม่ถูกส่งออกไปไหน</p>
        </footer>
      </main>
    </div>
  )
}
