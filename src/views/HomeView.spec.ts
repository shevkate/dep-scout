import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/api/github', () => ({
  searchRepositories: vi.fn(),
  DEFAULT_PER_PAGE: 20,
  SEARCH_RESULT_CAP: 1000,
}))
import { searchRepositories } from '@/api/github'
import type { GitHubRepo } from '@/api/types'
import HomeView from './HomeView.vue'

// Vuetify relies on browser APIs that jsdom doesn't implement.
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
  vi.mocked(searchRepositories).mockReset()
})

function makeRepo(id: number, fullName: string): GitHubRepo {
  const [login = 'owner', name = 'repo'] = fullName.split('/')
  return {
    id,
    name,
    full_name: fullName,
    owner: { login },
    html_url: '',
    description: 'desc',
    homepage: null,
    language: 'TypeScript',
    license: { key: 'mit', name: 'MIT', spdx_id: 'MIT' },
    topics: [],
    stargazers_count: 1000,
    archived: false,
    fork: false,
    pushed_at: '2026-06-01T00:00:00Z',
  }
}

function mountView() {
  const vuetify = createVuetify()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: HomeView },
      { path: '/repo/:owner/:repo', component: { template: '<div />' } },
    ],
  })
  return mount(HomeView, { global: { plugins: [vuetify, router, createPinia()] } })
}

describe('HomeView', () => {
  it('shows the idle empty state before any search', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Search for a repository')
  })

  it('renders a row per repo after a successful search', async () => {
    vi.mocked(searchRepositories).mockResolvedValue({
      total_count: 2,
      incomplete_results: false,
      items: [makeRepo(1, 'alpha/one'), makeRepo(2, 'beta/two')],
    })
    const wrapper = mountView()

    await wrapper.find('input').setValue('vue')
    await wrapper.find('input').trigger('keyup.enter')
    await flushPromises()

    expect(wrapper.text()).toContain('alpha/one')
    expect(wrapper.text()).toContain('beta/two')
  })

  it('shows a no-results state when nothing matches', async () => {
    vi.mocked(searchRepositories).mockResolvedValue({
      total_count: 0,
      incomplete_results: false,
      items: [],
    })
    const wrapper = mountView()

    await wrapper.find('input').setValue('zzzzz')
    await wrapper.find('input').trigger('keyup.enter')
    await flushPromises()

    expect(wrapper.text()).toContain('Nothing found')
  })
})
