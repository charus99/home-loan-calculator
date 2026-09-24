import { useMemo, useState } from 'react'
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
import { formatBaht, roundToSatang } from './format'
import { ThemeProvider } from './ThemeContext'
import { StepLabel } from './StepLabel'
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
      // Rounded to the satang, because this lands in an input the visitor
      // reads and edits — the raw annuity figure runs to twelve decimals.
      restored.monthlyPayment = roundToSatang(
        annuityPayment(
          restored.principal,
          restored.rateTiers[0].annualRatePercent,
          restored.termMonths,
        ),
      )
      restored.termMonths = MAX_TERM_MONTHS
    }

    return restored
  }
}

interface CalculationInputs {
  currentLoan: LoanTerms
  alternativeLoan: LoanTerms
  costs: RefinanceCosts
}

/** Validates a set of inputs and, if they are usable, compares the two loans. */
function runComparison({ currentLoan, alternativeLoan, costs }: CalculationInputs) {
  const problems = [
    ...validateRateTiers(currentLoan.rateTiers).map((p) => `สินเชื่อปัจจุบัน: ${p}`),
    ...validateRateTiers(alternativeLoan.rateTiers).map((p) => `ทางเลือกใหม่: ${p}`),
  ]

  // Without an instalment there is nothing to compare, and the schedule would
  // silently fall back to an annuity over the 40-year ceiling.
  if (!currentLoan.monthlyPayment || currentLoan.monthlyPayment <= 0) {
    problems.push('สินเชื่อปัจจุบัน: ต้องกรอกค่างวดต่อเดือน')
  }

  if (problems.length > 0) {
    return { problems, comparison: null }
  }

  // With no instalment of its own, the alternative is judged at the current
  // loan's payment, so a lower rate shows up as clearing the debt sooner
  // rather than as a smaller payment stretched over a longer term. A lender's
  // quoted instalment, once entered, takes precedence.
  const alternativeToCompare = {
    ...alternativeLoan,
    monthlyPayment: alternativeLoan.monthlyPayment ?? currentLoan.monthlyPayment,
  }

  try {
    return {
      problems,
      comparison: compareRefinance(currentLoan, alternativeToCompare, costs),
    }
  } catch (error) {
    // A schedule can refuse to build on inputs the tier check does not cover,
    // such as a zero principal. Surfacing it beats rendering a blank page.
    return {
      problems,
      comparison: error instanceof Error ? error : new Error('คำนวณไม่สำเร็จ'),
    }
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

  // Results come from the inputs as they stood at the last press of the
  // calculate button, not from what is being typed. Opening the page counts as
  // a press, so a returning visitor sees their figures straight away.
  const [calculated, setCalculated] = useState<CalculationInputs>(() => ({
    currentLoan,
    alternativeLoan,
    costs,
  }))

  const pending: CalculationInputs = { currentLoan, alternativeLoan, costs }

  // Edited but not yet calculated. The results then describe other figures
  // than the ones on screen, so they are dimmed and labelled rather than left
  // looking current.
  const isStale = JSON.stringify(pending) !== JSON.stringify(calculated)

  const calculate = () => setCalculated(pending)

  const { problems, comparison } = useMemo(() => runComparison(calculated), [calculated])

  return (
    <ThemeProvider value={scheme}>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* White text on blue-700 → indigo-600 measures above 6:1 at both
            ends of the gradient; the dark variant keeps the same hue family
            but drops the brightness so it does not glare against the page. */}
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-600 px-6 py-7 text-white shadow-lg dark:from-blue-950 dark:to-indigo-950 dark:ring-1 dark:ring-white/10">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl"
            >
              🏠
            </span>
            <div>
              <h1 className="text-3xl font-bold">คำนวณสินเชื่อบ้าน</h1>
              <p className="mt-1 text-white/85">
                เปรียบเทียบสินเชื่อปัจจุบันกับทางเลือกใหม่ ดอกเบี้ยลดต้นรายวันแบบธนาคารไทย
              </p>
            </div>
          </div>
          <ThemeToggle preference={preference} onChange={setPreference} tone="onColor" />
        </header>

        <form
          // A form so that Enter in any field calculates, the way a borrower
          // expects after typing a figure in. noValidate because the app checks
          // the inputs itself and explains problems in Thai; the browser's own
          // validation would otherwise block the submit silently first.
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            calculate()
          }}
        >
        <StepLabel step={1} title="ข้อมูลสินเชื่อ" className="mt-8" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <LoanForm
            title="สินเชื่อปัจจุบัน"
            hint="กรอกยอดคงเหลือ ค่างวด และอัตราที่จ่ายอยู่ตอนนี้"
            terms={currentLoan}
            onChange={setCurrentLoan}
            accent="current"
            paymentField="required"
            monthsToPayoff={
              isStale || comparison instanceof Error
                ? undefined
                : comparison?.current.monthsToPayoff
            }
          />
          <LoanForm
            title="ทางเลือกใหม่"
            hint="ข้อเสนอรีไฟแนนซ์ หรือของธนาคารอีกเจ้า"
            terms={alternativeLoan}
            onChange={setAlternativeLoan}
            accent="alternative"
            paymentField="optional"
            inheritedPayment={currentLoan.monthlyPayment}
            monthsToPayoff={
              isStale || comparison instanceof Error
                ? undefined
                : comparison?.alternative.monthsToPayoff
            }
          />
        </div>

        <StepLabel step={2} title="ค่าใช้จ่ายรีไฟแนนซ์" className="mt-8" />
        <div className="mt-4">
          <CostsForm costs={costs} onChange={setCosts} loanAmount={alternativeLoan.principal} />
        </div>

        {/* Sticky, because the button sits below the costs form: without it a
            visitor editing the loan fields at the top cannot see it, just as
            their payoff figures disappear. */}
        <div className="panel sticky bottom-4 z-10 mt-6 flex flex-wrap items-center gap-4 p-4 shadow-lg">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
            disabled={!isStale}
          >
            คำนวณ
          </button>
          <p role="status" className="ink-muted text-sm">
            {isStale ? (
              'มีการแก้ตัวเลข กดคำนวณหรือกด Enter เพื่ออัปเดตผลลัพธ์'
            ) : comparison && !(comparison instanceof Error) ? (
              // The verdict in brief, so the answer stays in view while the
              // loan fields at the top are being edited.
              <span className="ink-strong text-base">
                <span
                  className={
                    comparison.netSaving > 0
                      ? 'font-semibold text-emerald-700 dark:text-emerald-300'
                      : 'font-semibold text-amber-700 dark:text-amber-300'
                  }
                >
                  {comparison.netSaving > 0 ? '✓ คุ้ม' : '! ยังไม่คุ้ม'}
                </span>
                {' · '}
                ประหยัด <strong className="tabular-nums">{formatBaht(comparison.netSaving)}</strong>
              </span>
            ) : (
              'ตรวจสอบข้อมูลที่กรอกด้านล่าง'
            )}
          </p>
        </div>
        </form>

        <div
          className={isStale ? 'pointer-events-none opacity-40 transition-opacity' : 'transition-opacity'}
          aria-hidden={isStale}
        >
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
            <StepLabel step={3} title="ผลลัพธ์" className="mt-10" />
            <div className="mt-4">
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
        </div>

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
