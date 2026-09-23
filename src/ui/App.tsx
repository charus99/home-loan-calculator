import { useMemo } from 'react'
import { compareRefinance } from '../core/refinance'
import { annuityPayment, validateRateTiers } from '../core/interest'
import type { LoanTerms, RefinanceCosts } from '../core/types'
import { BalanceChart } from './charts/BalanceChart'
import { BreakEvenChart } from './charts/BreakEvenChart'
import { PaymentSplitChart } from './charts/PaymentSplitChart'
import { ComparisonSummary } from './ComparisonSummary'
import { CostsForm } from './CostsForm'
import { LoanForm } from './LoanForm'
import { ScheduleTable } from './ScheduleTable'
import { ThemeProvider } from './ThemeContext'
import { ThemeToggle } from './ThemeToggle'
import { useStoredState } from './useStoredState'
import { useThemePreference } from './useColorScheme'

/** Someone part way through a loan at the post-promotional rate. */
/**
 * Long enough that a loan clears well before it, so termMonths never cuts a
 * schedule short. The instalment decides the real length; this is only a
 * ceiling. 40 years exceeds any Thai home loan term.
 */
const MAX_TERM_MONTHS = 480

const DEFAULT_CURRENT: LoanTerms = {
  principal: 2_400_000,
  rateTiers: [{ fromMonth: 1, annualRatePercent: 6.5 }],
  termMonths: MAX_TERM_MONTHS,
  monthlyPayment: 17_100,
  extraMonthlyPayment: 0,
}

/**
 * A refinancing offer that is genuinely cheaper: promotional years followed by
 * a rate still below the current one. Its instalment is not entered — it is
 * compared at the current loan's payment, so the saving appears as a shorter
 * term rather than a smaller payment.
 */
const DEFAULT_ALTERNATIVE: LoanTerms = {
  principal: 2_400_000,
  rateTiers: [
    { fromMonth: 1, annualRatePercent: 3 },
    { fromMonth: 37, annualRatePercent: 4.75 },
  ],
  termMonths: MAX_TERM_MONTHS,
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

/**
 * Restores stored terms, repairing shapes saved by earlier versions.
 *
 * JSON has no Date, so startDate comes back as a string. Terms saved before
 * the instalment became an input carry a real termMonths and no
 * monthlyPayment; deriving the payment from them keeps such a visitor's
 * figures intact instead of resetting their inputs.
 */
function reviveLoanTerms(fallback: LoanTerms) {
  return (parsed: unknown): LoanTerms => {
    if (typeof parsed !== 'object' || parsed === null) {
      return fallback
    }
    const terms = parsed as LoanTerms & { startDate?: string }
    if (!Array.isArray(terms.rateTiers) || terms.rateTiers.length === 0) {
      return fallback
    }

    const restored: LoanTerms = {
      ...terms,
      startDate: terms.startDate ? new Date(terms.startDate) : undefined,
    }

    if (fallback.monthlyPayment && !restored.monthlyPayment) {
      restored.monthlyPayment = annuityPayment(
        restored.principal,
        restored.rateTiers[0].annualRatePercent,
        restored.termMonths,
      )
      restored.termMonths = MAX_TERM_MONTHS
    }

    return restored
  }
}

export default function App() {
  const { preference, scheme, setPreference } = useThemePreference()

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

  // The alternative is judged at the same instalment as the current loan, so a
  // lower rate shows up as clearing the debt sooner rather than as a smaller
  // payment stretched over a longer term.
  const alternativeAtSamePayment = useMemo(
    () => ({ ...alternativeLoan, monthlyPayment: currentLoan.monthlyPayment }),
    [alternativeLoan, currentLoan.monthlyPayment],
  )

  const problems = useMemo(() => {
    const found = [
      ...validateRateTiers(currentLoan.rateTiers).map((p) => `สินเชื่อปัจจุบัน: ${p}`),
      ...validateRateTiers(alternativeLoan.rateTiers).map((p) => `ทางเลือกใหม่: ${p}`),
    ]

    // Without an instalment there is nothing to compare, and the schedule would
    // silently fall back to an annuity over the 40-year ceiling.
    if (!currentLoan.monthlyPayment || currentLoan.monthlyPayment <= 0) {
      found.push('สินเชื่อปัจจุบัน: ต้องกรอกค่างวดต่อเดือน')
    }

    return found
  }, [currentLoan.rateTiers, currentLoan.monthlyPayment, alternativeLoan.rateTiers])

  const comparison = useMemo(() => {
    if (problems.length > 0) {
      return null
    }
    try {
      return compareRefinance(currentLoan, alternativeAtSamePayment, costs)
    } catch (error) {
      // A schedule can refuse to build on inputs the tier check does not cover,
      // such as a zero principal. Surfacing it beats rendering a blank page.
      return error instanceof Error ? error : new Error('คำนวณไม่สำเร็จ')
    }
  }, [currentLoan, alternativeAtSamePayment, costs, problems])

  return (
    <ThemeProvider value={scheme}>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="ink-strong text-3xl font-bold">คำนวณสินเชื่อบ้าน</h1>
            <p className="ink mt-2">
              เปรียบเทียบสินเชื่อปัจจุบันกับทางเลือกใหม่ ดอกเบี้ยลดต้นรายวันแบบธนาคารไทย
            </p>
          </div>
          <ThemeToggle preference={preference} onChange={setPreference} />
        </header>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <LoanForm
            title="สินเชื่อปัจจุบัน"
            hint="กรอกยอดคงเหลือ ค่างวด และอัตราที่จ่ายอยู่ตอนนี้"
            terms={currentLoan}
            onChange={setCurrentLoan}
            askForPayment
            monthsToPayoff={
              comparison instanceof Error ? undefined : comparison?.current.monthsToPayoff
            }
          />
          <LoanForm
            title="ทางเลือกใหม่"
            hint="ข้อเสนอรีไฟแนนซ์ หรือของธนาคารอีกเจ้า"
            terms={alternativeLoan}
            onChange={setAlternativeLoan}
            askForPayment={false}
            monthsToPayoff={
              comparison instanceof Error ? undefined : comparison?.alternative.monthsToPayoff
            }
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
    </ThemeProvider>
  )
}
