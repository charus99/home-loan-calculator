import { useCallback, useEffect, useState } from 'react'

export type ColorScheme = 'light' | 'dark'

/** What the viewer chose. 'system' defers to the operating system setting. */
export type ThemePreference = 'system' | ColorScheme

const QUERY = '(prefers-color-scheme: dark)'
const STORAGE_KEY = 'home-loan:theme'

/**
 * The colour scheme in effect, and the control to change it.
 *
 * Tailwind styles the page through CSS, but Recharts takes its colours as
 * props, so the charts need the resolved scheme as a value. Both read the same
 * source of truth: the preference is written to a data-theme attribute on
 * <html>, which the stylesheet keys off, and returned here for the charts.
 */
export function useThemePreference() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStored())
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(() => readSystem())

  // Follow the system setting even while an explicit choice is active, so
  // switching back to 'system' takes effect without a reload.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }

    const media = window.matchMedia(QUERY)
    const update = () => setSystemScheme(media.matches ? 'dark' : 'light')

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const scheme: ColorScheme = preference === 'system' ? systemScheme : preference

  // The stylesheet's dark variant keys off this attribute, so it carries the
  // resolved scheme rather than the raw preference: writing 'system' here
  // would leave the page with no theme at all.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', scheme)
  }, [scheme])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      if (next === 'system') {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.setItem(STORAGE_KEY, next)
      }
    } catch {
      // Storage is unavailable in private windows and when site data is
      // blocked. The choice still applies for this session.
    }
  }, [])

  return { preference, scheme, setPreference }
}

function readStored(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function readSystem(): ColorScheme {
  try {
    return window.matchMedia(QUERY).matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
