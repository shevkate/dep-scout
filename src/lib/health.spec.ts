import { describe, it, expect } from 'vitest'
import { buildHealthReport } from './health'
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
    owner: { login: 'owner', avatar_url: '', html_url: '' },
    html_url: '',
    description: 'A repo',
    homepage: null,
    language: 'TypeScript',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' },
    topics: [],
    stargazers_count: 1000,
    watchers_count: 1000,
    forks_count: 100,
    open_issues_count: 10,
    archived: false,
    fork: false,
    disabled: false,
    default_branch: 'main',
    created_at: daysAgo(800),
    updated_at: daysAgo(5),
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
})
