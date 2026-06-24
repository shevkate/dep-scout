// Generic date / formatting helpers. Kept separate from domain logic because
// they are reused across the UI (e.g. "created 3 years ago" on a repo card).

const DAY = 1000 * 60 * 60 * 24

export function daysSince(isoDate: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(isoDate).getTime()) / DAY)
}

export function timeAgo(days: number): string {
  if (days <= 0) return 'today'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.round(days / 30)} months ago`
  return `${Math.round(days / 365)} years ago`
}
