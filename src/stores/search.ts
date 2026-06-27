import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GitHubRepo } from '@/api/types'

// Holds the most recent search so the detail page can suggest healthier matches
// from the same result set without re-fetching. A Pinia store (rather than a
// module-level singleton) keeps the shared state explicit, resettable and easy
// to provide in tests.
export const useSearchStore = defineStore('search', () => {
  const items = ref<GitHubRepo[]>([])
  const query = ref('')

  function save(newItems: GitHubRepo[], newQuery: string) {
    items.value = newItems
    query.value = newQuery
  }

  return { items, query, save }
})
