import type { ThemePreference } from './useColorScheme'

interface ThemeToggleProps {
  preference: ThemePreference
  onChange: (preference: ThemePreference) => void
  /**
   * 'onColor' for placement on a saturated background such as the header
   * band, where the default muted greys would lose contrast.
   */
  tone?: 'default' | 'onColor'
}

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: string }> = [
  { value: 'system', label: 'ตามระบบ', icon: '🖥' },
  { value: 'light', label: 'สว่าง', icon: '☀' },
  { value: 'dark', label: 'มืด', icon: '🌙' },
]

/**
 * Three-way theme control: follow the system, or pin light or dark.
 *
 * A radio group rather than a single toggle, because with only two states
 * there is no way to get back to following the system once you have picked.
 */
export function ThemeToggle({ preference, onChange, tone = 'default' }: ThemeToggleProps) {
  const onColor = tone === 'onColor'

  return (
    <fieldset
      className={`inline-flex rounded-lg border p-0.5 ${
        onColor ? 'border-white/30 bg-white/10' : 'hairline'
      }`}
    >
      <legend className="sr-only">ธีมสี</legend>
      {OPTIONS.map(({ value, label, icon }) => {
        const selected = preference === value
        const selectedClass = onColor
          ? 'bg-white text-slate-900'
          : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
        const idleClass = onColor
          ? 'text-white/85 hover:bg-white/15'
          : 'ink-muted hover:bg-slate-100 dark:hover:bg-slate-800'
        return (
          <label
            key={value}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-xs transition-colors ${
              selected ? selectedClass : idleClass
            }`}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={selected}
              onChange={() => onChange(value)}
              className="sr-only"
            />
            {/* pointer-events-none so a click always lands on the label rather
                than being swallowed by the icon, which sits over the input. */}
            <span aria-hidden="true" className="pointer-events-none">
              {icon}
            </span>{' '}
            <span className="pointer-events-none">{label}</span>
          </label>
        )
      })}
    </fieldset>
  )
}
