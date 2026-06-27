import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchRepositories, getRepository } from './github'
import { isGitHubApiError } from './errors'
import { clearToken, setToken } from './token'

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: init.headers ?? { 'content-type': 'application/json' },
  })
}

const EMPTY_SEARCH = { total_count: 0, incomplete_results: false, items: [] }

describe('github api client', () => {
  beforeEach(() => {
    clearToken()
    vi.restoreAllMocks()
  })

  it('parses a successful search response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ...EMPTY_SEARCH, total_count: 1 }))
    const res = await searchRepositories({ q: 'vue' })
    expect(res.total_count).toBe(1)
  })

  it('maps 404 to a not-found error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ message: 'Not Found' }, { status: 404 }),
    )
    await expect(getRepository('nope', 'nope')).rejects.toMatchObject({ kind: 'not-found' })
  })

  it('maps 422 to an invalid-query error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ message: 'Validation Failed' }, { status: 422 }),
    )
    await expect(searchRepositories({ q: '' })).rejects.toMatchObject({ kind: 'invalid-query' })
  })

  it('maps a 403 with no remaining quota to a rate-limit error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        { message: 'rate limited' },
        { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1700000000' } },
      ),
    )
    await expect(searchRepositories({ q: 'x' })).rejects.toMatchObject({ kind: 'rate-limit' })
  })

  it('rejects a malformed payload with an invalid-response error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ total_count: 'not-a-number', incomplete_results: false, items: [] }),
    )
    await expect(searchRepositories({ q: 'vue' })).rejects.toMatchObject({ kind: 'invalid-response' })
  })

  it('maps a thrown fetch (offline) to a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(getRepository('a', 'b')).rejects.toMatchObject({ kind: 'network' })
  })

  it('attaches an Authorization header when a token is set', async () => {
    setToken('ghp_test123')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(EMPTY_SEARCH))

    await searchRepositories({ q: 'vue' })

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer ghp_test123')
    clearToken()
  })

  it('sends no Authorization header without a token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(EMPTY_SEARCH))

    await searchRepositories({ q: 'vue' })

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })
})
