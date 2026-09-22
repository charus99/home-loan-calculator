import { describe, expect, it } from 'vitest'
import { buildYearTicks, formatYearTick } from './axis'

describe('buildYearTicks', () => {
  it('produces labels that are all different', () => {
    // The bug this guards against: ticks chosen off a month scale rendered as
    // "0 0 1 1 2 2" because several months rounded to the same year.
    const labels = buildYearTicks(264).map(formatYearTick)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('keeps the label count readable on a narrow chart', () => {
    expect(buildYearTicks(360).length).toBeLessThanOrEqual(11)
    expect(buildYearTicks(264).length).toBeLessThanOrEqual(11)
  })

  it('starts at the first month', () => {
    expect(buildYearTicks(264)[0]).toBe(1)
  })

  it('never places a tick past the end of the schedule', () => {
    const ticks = buildYearTicks(100)
    expect(Math.max(...ticks)).toBeLessThanOrEqual(100)
  })

  it('labels every year when the term is short', () => {
    expect(buildYearTicks(60).map(formatYearTick)).toEqual(['0', '1', '2', '3', '4'])
  })

  it('handles a term under a year', () => {
    expect(buildYearTicks(7)).toEqual([1])
  })
})

describe('formatYearTick', () => {
  it('counts the first twelve months as year zero', () => {
    expect(formatYearTick(1)).toBe('0')
    expect(formatYearTick(12)).toBe('0')
  })

  it('rolls over on the thirteenth month', () => {
    expect(formatYearTick(13)).toBe('1')
  })
})
