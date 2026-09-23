import type { ColorScheme } from './useColorScheme'

/**
 * Chart colors, validated rather than chosen by eye.
 *
 * Every set below was run through the data-viz palette validator against the
 * surface it renders on: lightness band, chroma floor, colorblind separation,
 * normal-vision separation and contrast. Do not substitute a hex here without
 * re-running that check — a plausible-looking lighter blue failed the lightness
 * and chroma gates outright.
 *
 * The dark values are the same hues re-stepped for the dark surface, not a
 * different palette. They clear every gate; the light set carries one known
 * warning (aqua at 2.74:1, below the 3:1 bar), for which the rule is relief
 * through a second channel — provided here by an always-present legend and the
 * full schedule table.
 */

interface ChartTheme {
  /** The two loans being compared. Distinct hues, not shades of one. */
  loan: { current: string; alternative: string }
  /**
   * Principal against interest within a single payment. Two different things,
   * not two magnitudes of one, so separate hues rather than one ramp.
   */
  paymentSplit: { principal: string; interest: string }
  /** Chrome: recessive by design so the data carries the attention. */
  chrome: { gridline: string; axis: string; mutedText: string; surface: string }
  /** Break-even reference line, drawn where cumulative savings reach zero. */
  breakEven: string
}

const LIGHT_THEME: ChartTheme = {
  loan: { current: '#2a78d6', alternative: '#eb6834' },
  paymentSplit: { principal: '#2a78d6', interest: '#1baf7a' },
  chrome: {
    gridline: '#e1e0d9',
    axis: '#c3c2b7',
    mutedText: '#898781',
    surface: '#fcfcfb',
  },
  breakEven: '#0ca30c',
}

const DARK_THEME: ChartTheme = {
  loan: { current: '#3987e5', alternative: '#d95926' },
  paymentSplit: { principal: '#3987e5', interest: '#199e70' },
  chrome: {
    gridline: '#2c2c2a',
    axis: '#383835',
    mutedText: '#898781',
    surface: '#1a1a19',
  },
  breakEven: '#0ca30c',
}

export function chartTheme(scheme: ColorScheme): ChartTheme {
  return scheme === 'dark' ? DARK_THEME : LIGHT_THEME
}
