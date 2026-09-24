interface StepLabelProps {
  step: number
  title: string
  className?: string
}

/**
 * The numbered label over each part of the page: loans, costs, results.
 *
 * Deliberately not a heading. Each section already carries its own heading
 * (the loan names, the costs title, the verdict), and adding another level
 * above them would only put an extra, less specific entry in the outline a
 * screen reader navigates by.
 */
export function StepLabel({ step, title, className = '' }: StepLabelProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white dark:bg-blue-500"
      >
        {step}
      </span>
      <span className="ink-strong text-base font-semibold">{title}</span>
      <span aria-hidden="true" className="hairline flex-1 border-t" />
    </div>
  )
}
