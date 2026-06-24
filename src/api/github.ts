// Typed GitHub REST client.
// No SDK — just `fetch` wrapped with:
//  - a request timeout (so a hung connection can't freeze the UI),
//  - caller-supplied AbortSignal support (so a stale search can be cancelled),
//  - a single place that maps HTTP failures to our GitHubErrorKind model.

import { GitHubApiError, type GitHubErrorKind } from './errors'
import { getToken } from './token'
import type {
  GitHubRepo,
  LanguagesResponse,
  SearchParams,
  SearchRepositoriesResponse,
  SortField,
} from './types'

const BASE_URL = 'https://api.github.com'
const DEFAULT_TIMEOUT_MS = 10_000

/** GitHub's search endpoint caps out at 1000 results regardless of total_count. */
export const MAX_SEARCH_RESULTS = 1000
export const DEFAULT_PER_PAGE = 20

interface RequestOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

function rateLimitReset(res: Response): Date | undefined {
  const reset = res.headers.get('x-ratelimit-reset')
  if (!reset) return undefined
  const seconds = Number(reset)
  return Number.isFinite(seconds) ? new Date(seconds * 1000) : undefined
}

/** Map a non-OK Response to a typed error, reading the body for a message. */
async function toError(res: Response): Promise<GitHubApiError> {
  const remaining = res.headers.get('x-ratelimit-remaining')

  // GitHub signals rate limiting with 403/429 AND remaining === '0'.
  // A 403 with quota left is a real permission error, so we keep them distinct
  if ((res.status === 403 || res.status === 429) && remaining === '0') {
    return new GitHubApiError(
      'rate-limit',
      'GitHub API rate limit exceeded. Add a token or wait for the limit to reset.',
      { status: res.status, rateLimitReset: rateLimitReset(res) },
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

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
    if (timedOut) {
      throw new GitHubApiError('timeout', 'The request to GitHub timed out. Please try again.')
    }
    // External cancellation: re-throw the DOMException so callers can ignore it
    if (signal?.aborted) throw error
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

  return (await res.json()) as T
}

const SORT_PARAM: Record<Exclude<SortField, 'best-match'>, string> = {
  stars: 'stars',
  forks: 'forks',
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

  return request<SearchRepositoriesResponse>(`/search/repositories?${query.toString()}`, { signal })
}

/** Fetch a single repository's full detail. */
export async function getRepository(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<GitHubRepo> {
  return request<GitHubRepo>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { signal },
  )
}

/** Language breakdown (bytes per language) for a repository. */
export async function getLanguages(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<LanguagesResponse> {
  return request<LanguagesResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`,
    { signal },
  )
}
