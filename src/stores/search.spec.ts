import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/github', () => ({
  searchRepositories: vi.fn(),
  DEFAULT_PER_PAGE: 20,
}))
import { searchRepositories } from '@/api/github'
import { GitHubApiError } from '@/api/errors'
import type { GitHubRepo } from '@/api/types'
import { useSearchStore } from './search'

function repo(id: number): GitHubRepo {
  return {
    id,
    name: 'r',
    full_name: 'o/r',
    owner: { login: 'o' },
    html_url: '',
    description: null,
    license: null,
    stargazers_count: 1,
    archived: false,
    fork: false,
    pushed_at: '2026-06-01T00:00:00Z',
  }
}

describe('search store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(searchRepositories).mockReset()
  })

  it('populates results and applied query/sort/page on success', async () => {
    vi.mocked(searchRepositories).mockResolvedValue({
      total_count: 5,
      incomplete_results: false,
      items: [repo(1)],
    })
    const store = useSearchStore()

    await store.search('vue', 'stars', 2)

    expect(store.items).toHaveLength(1)
    expect(store.total).toBe(5)
    expect(store.query).toBe('vue')
    expect(store.sort).toBe('stars')
    expect(store.page).toBe(2)
    expect(store.searched).toBe(true)
  })

  it('records a friendly error and clears results on failure', async () => {
    vi.mocked(searchRepositories).mockRejectedValue(new GitHubApiError('rate-limit', 'raw'))
    const store = useSearchStore()

    await store.search('vue', 'best-match', 1)

    expect(store.error).toMatch(/rate limit/i)
    expect(store.items).toHaveLength(0)
  })

  it('ignores an empty query without calling the API', async () => {
    const store = useSearchStore()
    await store.search('', 'best-match', 1)
    expect(searchRepositories).not.toHaveBeenCalled()
  })
})
