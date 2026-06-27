// Typed GitHub REST client.
// !!!No SDK — just `fetch` wrapped with:
//  - a request timeout (so a hung connection can't freeze the ui),
//  - caller-supplied AbortSignal support (so a stale search can be cancelled),
//  - a single place that maps http failures to our GitHubErrorKind model.

import { GitHubApiError, type GitHubErrorKind } from './errors'
import { getToken } from './token'
import { repoSchema, searchResponseSchema } from './schemas'
import type { GitHubRepo, SearchParams, SearchRepositoriesResponse, SortField } from './types'
import type { z } from 'zod'

const BASE_URL = 'https://api.github.com'
const DEFAULT_TIMEOUT_MS = 10_000

export const DEFAULT_PER_PAGE = 20
// GitHub's search API never serves results past the first 1000.
export const SEARCH_RESULT_CAP = 1000

interface RequestOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

function buildHeaders(): HeadersInit {
  // Only the CORS-safelisted `Accept` header by default, so an unauthenticated
  // request stays a "simple" request with no CORS preflight — that keeps it
  // working behind restrictive proxies that drop OPTIONS. (The API version is
  // optional; GitHub falls back to its stable default.)
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

function rateLimitReset(res: Response, retryAfter: string | null): Date | undefined {
  // Secondary limits give Retry-After (seconds from now); primary limits give an
  // absolute X-RateLimit-Reset (unix seconds). Prefer Retry-After when present.
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds)) return new Date(Date.now() + seconds * 1000)
  }
  const reset = res.headers.get('x-ratelimit-reset')
  if (!reset) return undefined
  const seconds = Number(reset)
  return Number.isFinite(seconds) ? new Date(seconds * 1000) : undefined
}

/** Map a non-OK Response to a typed error, reading the body for a message. */
async function toError(res: Response): Promise<GitHubApiError> {
  const remaining = res.headers.get('x-ratelimit-remaining')
  const retryAfter = res.headers.get('retry-after')

  // Two flavours of rate limit, both 403/429: the PRIMARY limit zeroes
  // X-RateLimit-Remaining; the SECONDARY (abuse) limit sends Retry-After and
  // often no remaining===0. A plain 403 with neither is a real permission error,
  // so it falls through to the generic mapping below.
  if ((res.status === 403 || res.status === 429) && (remaining === '0' || retryAfter !== null)) {
    return new GitHubApiError(
      'rate-limit',
      'GitHub API rate limit exceeded. Add a token or wait for the limit to reset.',
      { status: res.status, rateLimitReset: rateLimitReset(res, retryAfter) },
    )
  }

  let apiMessage = ''
  try {
    const body = (await res.json()) as { message?: string }
    apiMessage = body.message ?? ''
  } catch {
    // Non-JSON body: ignore, fall back to a generic message.
  }

  const kind: GitHubErrorKind =
    res.status === 404 ? 'not-found' : res.status === 422 ? 'invalid-query' : 'http'

  return new GitHubApiError(kind, apiMessage || `Request failed with status ${res.status}.`, {
    status: res.status,
  })
}

async function request<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  options: RequestOptions = {},
): Promise<z.infer<S>> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options

  const controller = new AbortController()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  // Forward an external abort (e.g. a superseded search) into our controller
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: buildHeaders(),
      signal: controller.signal,
    })
  } catch (error) {
    // Caller cancellation wins over our timeout: if the external signal aborted,
    // re-throw the DOMException so the caller can ignore it. Only then is a fired
    // timeout a real timeout; anything else is a network failure.
    if (signal?.aborted) throw error
    if (timedOut) {
      throw new GitHubApiError('timeout', 'The request to GitHub timed out. Please try again.')
    }
    throw new GitHubApiError(
      'network',
      'Could not reach GitHub. Check your connection and try again.',
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    throw await toError(res)
  }

  // Validate the payload instead of blindly trusting its shape: a malformed
  // response fails loudly here rather than throwing somewhere in a template.
  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new GitHubApiError('invalid-response', 'GitHub returned a response that could not be read.')
  }
  const result = schema.safeParse(json)
  if (!result.success) {
    throw new GitHubApiError('invalid-response', 'GitHub returned data in an unexpected format.')
  }
  return result.data
}

const SORT_PARAM: Record<Exclude<SortField, 'best-match'>, string> = {
  stars: 'stars',
  updated: 'updated',
}

/** Search repositories. Returns a page of results plus the (capped) total. */
export async function searchRepositories(
  params: SearchParams,
): Promise<SearchRepositoriesResponse> {
  const { q, page = 1, perPage = DEFAULT_PER_PAGE, sort = 'best-match', order = 'desc', signal } =
    params

  const query = new URLSearchParams({
    q,
    page: String(page),
    per_page: String(perPage),
    order,
  })
  // Omitting `sort` entirely is what gives GitHub's "best match" relevance sort.
  if (sort !== 'best-match') {
    query.set('sort', SORT_PARAM[sort])
  }

  return request(`/search/repositories?${query.toString()}`, searchResponseSchema, { signal })
}

/** Fetch a single repository's full detail. */
export async function getRepository(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<GitHubRepo> {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, repoSchema, {
    signal,
  })
}
