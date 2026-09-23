import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useThemePreference } from './useColorScheme'

/** Stands in for window.matchMedia, which jsdom does not implement. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>()

  const media = {
    matches,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  )

  return {
    /** Simulates the viewer changing their system theme. */
    change(next: boolean) {
      media.matches = next
      listeners.forEach((listener) => listener())
    },
    listenerCount: () => listeners.size,
  }
}

const themeAttribute = () => document.documentElement.getAttribute('data-theme')

describe('useThemePreference', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('follows the system setting by default', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useThemePreference())
    expect(result.current.preference).toBe('system')
    expect(result.current.scheme).toBe('dark')
  })

  it('lets an explicit choice override the system', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useThemePreference())

    act(() => result.current.setPreference('light'))

    expect(result.current.scheme).toBe('light')
    expect(themeAttribute()).toBe('light')
  })

  it('writes the resolved scheme to the attribute, never "system"', () => {
    // The stylesheet keys off this attribute, so leaving 'system' there would
    // strip the theme from the page entirely.
    stubMatchMedia(true)
    const { result } = renderHook(() => useThemePreference())
    expect(themeAttribute()).toBe('dark')

    act(() => result.current.setPreference('system'))
    expect(themeAttribute()).toBe('dark')
  })

  it('remembers an explicit choice across mounts', () => {
    stubMatchMedia(false)
    const first = renderHook(() => useThemePreference())
    act(() => first.result.current.setPreference('dark'))
    first.unmount()

    const second = renderHook(() => useThemePreference())
    expect(second.result.current.preference).toBe('dark')
    expect(second.result.current.scheme).toBe('dark')
  })

  it('forgets the choice when set back to system', () => {
    stubMatchMedia(false)
    const first = renderHook(() => useThemePreference())
    act(() => first.result.current.setPreference('dark'))
    act(() => first.result.current.setPreference('system'))
    first.unmount()

    const second = renderHook(() => useThemePreference())
    expect(second.result.current.preference).toBe('system')
    expect(second.result.current.scheme).toBe('light')
  })

  it('tracks a system change while following the system', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => useThemePreference())
    expect(result.current.scheme).toBe('light')

    act(() => media.change(true))
    expect(result.current.scheme).toBe('dark')
  })

  it('ignores a system change while pinned to a scheme', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => useThemePreference())
    act(() => result.current.setPreference('light'))

    act(() => media.change(true))
    expect(result.current.scheme).toBe('light')
  })

  it('falls back to light when matchMedia is unavailable', () => {
    // Private windows and older browsers can leave this undefined; the page
    // must still render rather than throwing.
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useThemePreference())
    expect(result.current.scheme).toBe('light')
  })

  it('stops listening when unmounted', () => {
    const media = stubMatchMedia(false)
    const { unmount } = renderHook(() => useThemePreference())
    expect(media.listenerCount()).toBe(1)
    unmount()
    expect(media.listenerCount()).toBe(0)
  })
})
