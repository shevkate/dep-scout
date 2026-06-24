// A small, explicit error model. Every failure the UI needs to react to
// differently gets its own `kind`, so views can switch on it instead of
// sniffing status codes or matching error strings. This is what lets us turn
// each edge case (rate limit, 404, bad query, offline) into a distinct,
// non-breaking UI state.

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
