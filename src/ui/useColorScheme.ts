import { useEffect, useState } from 'react'

export type ColorScheme = 'light' | 'dark'

const QUERY = '(prefers-color-scheme: dark)'

/**
 * The colour scheme the page is currently rendered in.
 *
 * Tailwind handles light and dark styling through CSS, but Recharts takes its
 * colours as props, so the chart components need the scheme as a value. This
 * follows the operating system setting and updates when the viewer changes it
 * without reloading.
 */
export function useColorScheme(): ColorScheme {
  const [scheme, setScheme] = useState<ColorScheme>(() => readScheme())

  useEffect(() => {
    // matchMedia is missing in some test environments and in older browsers;
    // the initial value already fell back to light, so there is nothing to
    // subscribe to.
    if (typeof window.matchMedia !== 'function') {
      return
    }

    const media = window.matchMedia(QUERY)
    const update = () => setScheme(media.matches ? 'dark' : 'light')

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return scheme
}

function readScheme(): ColorScheme {
  try {
    return window.matchMedia(QUERY).matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
