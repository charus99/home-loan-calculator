/**
 * Chart colors, validated rather than chosen by eye.
 *
 * Every pair below was run through the data-viz palette validator for both
 * light and dark surfaces: lightness band, chroma floor, colorblind separation,
 * normal-vision separation and contrast. Do not substitute a hex here without
 * re-running that check — a plausible-looking lighter blue failed the lightness
 * and chroma gates outright.
 *
 * Known warning: aqua measures 2.74:1 on the light surface, below the 3:1 bar.
 * The rule for that case is relief through a second channel, which the charts
 * provide with an always-present legend and the full schedule table.
 */

/** The two loans being compared. Distinct hues, not shades of one. */
export const LOAN_COLORS = {
  current: '#2a78d6',
  alternative: '#eb6834',
} as const

/**
 * Principal against interest within a single payment.
 *
 * These are two different things, not two magnitudes of one thing, so they take
 * separate hues rather than a light and dark step of the same ramp.
 */
export const PAYMENT_SPLIT_COLORS = {
  principal: '#2a78d6',
  interest: '#1baf7a',
} as const

/** Chart chrome: recessive by design so the data carries the attention. */
export const CHART_CHROME = {
  gridline: '#e1e0d9',
  axis: '#c3c2b7',
  mutedText: '#898781',
  surface: '#fcfcfb',
} as const

/** Break-even reference line, drawn where cumulative savings reach zero. */
export const BREAK_EVEN_COLOR = '#0ca30c'
