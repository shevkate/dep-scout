import { defineStore } from 'pinia'
import { ref } from 'vue'
import { searchRepositories, DEFAULT_PER_PAGE } from '@/api/github'
import { describeError } from '@/api/errors'
import { useAbortableRequest } from '@/composables/useAbortableRequest'
import type { GitHubRepo, SortField } from '@/api/types'

// The single source of truth for the search: the *applied* query/sort/page plus
// the results. Keeping it here (instead of in the view) means returning to the
// search screen restores state explicitly — no <keep-alive> needed — and the
// detail page can read the same results to suggest healthier matches.
export const useSearchStore = defineStore('search', () => {
  const query = ref('') // the applied query the current results belong to
  const sort = ref<SortField>('best-match')
  const page = ref(1)
  const total = ref(0)
  const items = ref<GitHubRepo[]>([])
  const incomplete = ref(false)
  const error = ref('')
  const searched = ref(false)

  const { loading, run } = useAbortableRequest()

  async function search(q: string, sortValue: SortField, pageNumber: number) {
    if (!q) return
    error.value = ''

    const result = await run((signal) =>
      searchRepositories({ q, sort: sortValue, page: pageNumber, perPage: DEFAULT_PER_PAGE, signal }),
    )

    if (result.status === 'superseded') return
    searched.value = true

    if (result.status === 'error') {
      error.value = describeError(result.error)
      items.value = []
      total.value = 0
      return
    }

    items.value = result.data.items
    total.value = result.data.total_count
    incomplete.value = result.data.incomplete_results
    query.value = q
    sort.value = sortValue
    page.value = pageNumber
  }

  return { query, sort, page, total, items, incomplete, error, searched, loading, search }
})
