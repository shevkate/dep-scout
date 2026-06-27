import { describe, it, expect } from 'vitest'
import { buildHealthReport, pickAlternatives } from './health'
import type { GitHubRepo } from '@/api/types'

// A fixed "now" makes every age-based assertion deterministic.
const NOW = new Date('2026-06-25T12:00:00Z')

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

// Healthy by default; each test overrides only the field it cares about.
function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    id: 1,
    name: 'repo',
    full_name: 'owner/repo',
    owner: { login: 'owner' },
    html_url: '',
    description: 'A repo',
    homepage: null,
    language: 'TypeScript',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' },
    topics: [],
    stargazers_count: 1000,
    archived: false,
    fork: false,
    pushed_at: daysAgo(5),
    ...overrides,
  }
}

describe('buildHealthReport', () => {
  it('rates a fresh, licensed, popular repo as healthy', () => {
    const report = buildHealthReport(makeRepo(), NOW)
    expect(report.level).toBe('healthy')
    expect(report.signals.every((s) => s.status !== 'bad')).toBe(true)
  })

  it('flags an archived repo as risky even with a million stars', () => {
    const report = buildHealthReport(makeRepo({ archived: true, stargazers_count: 1_000_000 }), NOW)
    expect(report.level).toBe('risky')
  })

  it('flags a repo with no license as risky', () => {
    const report = buildHealthReport(makeRepo({ license: null }), NOW)
    expect(report.level).toBe('risky')
    const license = report.signals.find((s) => s.label === 'License')
    expect(license?.status).toBe('bad')
  })

  it('flags a repo not pushed in over a year as risky', () => {
    const report = buildHealthReport(makeRepo({ pushed_at: daysAgo(400) }), NOW)
    expect(report.level).toBe('risky')
  })

  it('marks a repo stale for a few months as caution, not risky', () => {
    const report = buildHealthReport(makeRepo({ pushed_at: daysAgo(180) }), NOW)
    expect(report.level).toBe('caution')
  })

  it('adds a warning signal for forks', () => {
    const report = buildHealthReport(makeRepo({ fork: true }), NOW)
    expect(report.level).toBe('caution')
    expect(report.signals.some((s) => s.label === 'Fork')).toBe(true)
  })

  it('scores a healthy repo higher than an archived popular one', () => {
    // This is what lets us rank "healthier alternatives": a single deal-breaker
    // outweighs raw popularity.
    const healthy = buildHealthReport(makeRepo(), NOW)
    const archived = buildHealthReport(
      makeRepo({ archived: true, stargazers_count: 1_000_000 }),
      NOW,
    )
    expect(healthy.score).toBeGreaterThan(archived.score)
  })

  it('does not call a barely-starred repo healthy', () => {
    const report = buildHealthReport(makeRepo({ stargazers_count: 3 }), NOW)
    expect(report.level).not.toBe('healthy')
  })

  it('handles a missing push date without producing NaN', () => {
    const repo = makeRepo()
    // Simulate a malformed payload where pushed_at is absent.
    ;(repo as { pushed_at: unknown }).pushed_at = undefined
    const report = buildHealthReport(repo, NOW)
    const maintenance = report.signals.find((s) => s.label === 'Maintenance')
    expect(maintenance?.value).not.toContain('NaN')
  })
})

describe('pickAlternatives', () => {
  const current = makeRepo({ id: 1, pushed_at: daysAgo(400) }) // risky: stale > 1y
  const currentScore = buildHealthReport(current, NOW).score

  it('returns only repos strictly healthier than the current one, best first', () => {
    const healthier = makeRepo({ id: 2 }) // fresh + licensed + popular
    const alsoRisky = makeRepo({ id: 3, license: null }) // blocker → not healthier
    const lessHealthy = makeRepo({ id: 4, stargazers_count: 3, pushed_at: daysAgo(400) })

    const result = pickAlternatives([current, healthier, alsoRisky, lessHealthy], 1, currentScore, NOW)

    expect(result.map((r) => r.repo.id)).toEqual([2])
  })

  it('excludes the current repo and respects the limit', () => {
    const items = [current, makeRepo({ id: 2 }), makeRepo({ id: 3 }), makeRepo({ id: 4 })]
    const result = pickAlternatives(items, 1, currentScore, NOW, 2)

    expect(result).toHaveLength(2)
    expect(result.every((r) => r.repo.id !== 1)).toBe(true)
  })
})
