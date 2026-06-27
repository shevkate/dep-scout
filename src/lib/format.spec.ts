import { describe, it, expect } from 'vitest'
import { daysSince, timeAgo } from './format'

describe('timeAgo', () => {
  it('handles today and recent days', () => {
    expect(timeAgo(0)).toBe('today')
    expect(timeAgo(3)).toBe('3 days ago')
  })

  it('switches to months and years', () => {
    expect(timeAgo(60)).toBe('2 months ago')
    expect(timeAgo(730)).toBe('2 years ago')
  })
})

describe('daysSince', () => {
  it('counts whole days between two dates', () => {
    const now = new Date('2026-06-25T00:00:00Z')
    expect(daysSince('2026-06-20T00:00:00Z', now)).toBe(5)
  })
})
