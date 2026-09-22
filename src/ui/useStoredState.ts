import { useEffect, useState } from 'react'

/**
 * State that survives a reload, kept in the browser and nowhere else.
 *
 * Every access is guarded: localStorage throws in private windows and when site
 * data is blocked, and a stored value can be stale or corrupt after a change to
 * the shape being stored. In all those cases the caller gets the initial value
 * rather than a crash.
 */
export function useStoredState<T>(
  key: string,
  initialValue: T,
  /** Restores non-JSON values such as Date, which JSON.parse returns as strings. */
  revive?: (parsed: unknown) => T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored === null) {
        return initialValue
      }
      const parsed: unknown = JSON.parse(stored)
      return revive ? revive(parsed) : (parsed as T)
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage being unavailable must not break the calculator; the figures
      // stay correct for this session and are simply not remembered.
    }
  }, [key, value])

  return [value, setValue]
}
