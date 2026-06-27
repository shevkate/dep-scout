import { ref } from 'vue'
import type { GitHubRepo } from '@/api/types'

// Module-level state shared across components without a store library: it holds
// the most recent search. The detail page reads it to suggest healthier matches
// from the same search — with zero extra API requests, since the data is already
// here. State lives outside the function so every caller sees the same refs.
const items = ref<GitHubRepo[]>([])
const query = ref('')

export function useLastSearch() {
  function save(newItems: GitHubRepo[], newQuery: string) {
    items.value = newItems
    query.value = newQuery
  }

  return { items, query, save }
}
