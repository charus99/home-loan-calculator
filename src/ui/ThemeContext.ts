import { createContext, useContext } from 'react'
import type { ColorScheme } from './useColorScheme'

/**
 * The colour scheme in effect, shared from the top of the tree.
 *
 * The charts must agree with the stylesheet at every render. When each chart
 * called the preference hook itself they each held their own state, and a
 * scheme change reached the CSS immediately while the chart colours lagged a
 * render behind. One provider removes that possibility.
 */
const ThemeContext = createContext<ColorScheme>('light')

export const ThemeProvider = ThemeContext.Provider

export function useTheme(): ColorScheme {
  return useContext(ThemeContext)
}
