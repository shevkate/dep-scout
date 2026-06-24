// "Should you depend on this repo?"
// Pure scoring logic.
// That keeps it trivial to unit-test. `now` is passed in so tests are stable.

import type { GitHubRepo } from '@/api/types'
import { daysSince, timeAgo } from '@/lib/format'

// Types

export type SignalStatus = 'good' | 'warn' | 'bad' | 'neutral'

// One row in the health panel.
export interface HealthSignal {
  label: string // e.g. "Maintenance"
  value: string // e.g. "Last push 2 months ago"
  status: SignalStatus
  hint: string // why this matters for a dependency
}

export type VerdictLevel = 'healthy' | 'caution' | 'risky'

export interface HealthReport {
  level: VerdictLevel
  headline: string
  score: number // hidden number, used only to rank alternatives
  signals: HealthSignal[]
}

// The report

export function buildHealthReport(repo: GitHubRepo, now: Date = new Date()): HealthReport {
  const signals: HealthSignal[] = []

  // 1. Maintenance: is it still alive?
  if (repo.archived) {
    signals.push({
      label: 'Maintenance',
      value: 'Archived',
      status: 'bad',
      hint: 'The project is archived (read-only). It will not receive fixes.',
    })
  } else {
    const days = daysSince(repo.pushed_at, now)
    signals.push({
      label: 'Maintenance',
      value: `Last push ${timeAgo(days)}`,
      status: days <= 90 ? 'good' : days <= 365 ? 'warn' : 'bad',
      hint: 'How recently the code was updated.',
    })
  }

  // 2. License: are we legally allowed to use it?
  if (repo.license) {
    signals.push({
      label: 'License',
      value: repo.license.spdx_id ?? repo.license.name,
      status: 'good',
      hint: 'A clear license tells you how you may use the code.',
    })
  } else {
    signals.push({
      label: 'License',
      value: 'None',
      status: 'bad',
      hint: 'No license means all rights reserved by default — risky to depend on.',
    })
  }

  // 3. Popularity: how many people rely on it?
  const stars = repo.stargazers_count
  signals.push({
    label: 'Popularity',
    value: `${stars.toLocaleString('en-US')} stars`,
    status: stars >= 500 ? 'good' : stars >= 50 ? 'warn' : 'neutral',
    hint: 'More users means bugs surface and get fixed faster.',
  })

  // 4. Fork: is it just a copy of another project?
  if (repo.fork) {
    signals.push({
      label: 'Fork',
      value: 'This is a fork',
      status: 'warn',
      hint: 'Forks can lag behind the original. Prefer the upstream if it is active.',
    })
  }

  // Score logic: +1 per green, -1 per red
  const greens = signals.filter((s) => s.status === 'good').length
  const reds = signals.filter((s) => s.status === 'bad').length
  const score = greens - reds

  // Verdict: a single red drops it straight to "risky"
  let level: VerdictLevel
  let headline: string
  if (reds > 0) {
    level = 'risky'
    headline = 'Think twice before depending on this'
  } else if (signals.some((s) => s.status === 'warn')) {
    level = 'caution'
    headline = 'Usable, but check the caveats'
  } else {
    level = 'healthy'
    headline = 'Looks safe to depend on'
  }

  return { level, headline, score, signals }
}
