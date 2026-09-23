import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useColorScheme } from './useColorScheme'

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
    /** Simulates the viewer switching their system theme. */
    change(next: boolean) {
      media.matches = next
      listeners.forEach((listener) => listener())
    },
    listenerCount: () => listeners.size,
  }
}

describe('useColorScheme', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports dark when the system prefers it', () => {
    stubMatchMedia(true)
    expect(renderHook(() => useColorScheme()).result.current).toBe('dark')
  })

  it('reports light when the system does not', () => {
    stubMatchMedia(false)
    expect(renderHook(() => useColorScheme()).result.current).toBe('light')
  })

  it('falls back to light when matchMedia is unavailable', () => {
    // Private windows and older browsers can leave this undefined; the charts
    // must still render rather than throwing.
    vi.stubGlobal('matchMedia', undefined)
    expect(renderHook(() => useColorScheme()).result.current).toBe('light')
  })

  it('stops listening when unmounted', () => {
    const media = stubMatchMedia(false)
    const { unmount } = renderHook(() => useColorScheme())
    expect(media.listenerCount()).toBe(1)
    unmount()
    expect(media.listenerCount()).toBe(0)
  })
})
