// A small, explicit error model. Every failure the UI needs to react to
// differently gets its own `kind`, so views can switch on it instead of
// sniffing status codes or matching error strings. This is what lets us turn
// each edge case (like rate limit, 404, bad query, offline) into a distinct,
// non-breaking UI state

export type GitHubErrorKind =
  | 'rate-limit' // 403/429 with no remaining quota
  | 'not-found' // 404
  | 'invalid-query' // 422 — e.g. empty or malformed search query
  | 'network' // fetch threw — offline, DNS, CORS
  | 'timeout' // request aborted by our own timeout
  | 'http' // any other non-OK response

export class GitHubApiError extends Error {
  readonly kind: GitHubErrorKind
  readonly status?: number
  /** When rate-limited, the time the quota resets (from X-RateLimit-Reset). */
  readonly rateLimitReset?: Date

  constructor(
    kind: GitHubErrorKind,
    message: string,
    options: { status?: number; rateLimitReset?: Date } = {},
  ) {
    super(message)
    this.name = 'GitHubApiError'
    this.kind = kind
    this.status = options.status
    this.rateLimitReset = options.rateLimitReset
  }
}

/** Type guard so callers can narrow `unknown` from a catch block. */
export function isGitHubApiError(error: unknown): error is GitHubApiError {
  return error instanceof GitHubApiError
}

/**
 * Turn any caught error into a friendly, user-facing message. One place decides
 * how each `kind` reads, so both screens stay consistent. The switch is
 * exhaustive over GitHubErrorKind, so adding a new kind forces a new case here.
 */
export function describeError(error: unknown): string {
  if (!isGitHubApiError(error)) {
    return 'Something went wrong. Please try again.'
  }

  switch (error.kind) {
    case 'rate-limit': {
      const resetsAt = error.rateLimitReset
        ? ` Resets at ${error.rateLimitReset.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}.`
        : ''
      return `GitHub's rate limit is reached.${resetsAt} Add a personal access token to raise it.`
    }
    case 'not-found':
      return 'Not found — double-check the name.'
    case 'invalid-query':
      return 'That search query is not valid. Try different keywords.'
    case 'network':
      return 'Could not reach GitHub. Check your connection and try again.'
    case 'timeout':
      return 'The request to GitHub timed out. Please try again.'
    case 'http':
      return error.message || 'GitHub returned an unexpected error.'
  }
}
