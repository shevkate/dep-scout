<script setup lang="ts">
import { computed, ref } from 'vue'
import { searchRepositories } from '@/api/github'
import { describeError } from '@/api/errors'
import type { GitHubRepo, SortField } from '@/api/types'
import { buildHealthReport } from '@/lib/health'
import { LEVEL_COLOR, LEVEL_ICON, LEVEL_LABEL } from '@/lib/healthDisplay'
import { useSearchStore } from '@/stores/search'
import StarIcon from '@/components/StarIcon.vue'

const PER_PAGE = 20
// GitHub's search API never serves results past the first 1000.
const GITHUB_SEARCH_CAP = 1000

const store = useSearchStore()

const query = ref('')
const sort = ref<SortField>('best-match')
// The term/sort the currently shown results belong to — used for paging so a
// half-typed query or an unapplied sort can't change the page underfoot.
const activeQuery = ref('')
const activeSort = ref<SortField>('best-match')
const page = ref(1)
const total = ref(0)
const results = ref<GitHubRepo[]>([])
const incomplete = ref(false)
const loading = ref(false)
const error = ref('')
const searched = ref(false)

const sortOptions: { value: SortField; title: string }[] = [
  { value: 'best-match', title: 'Best match' },
  { value: 'stars', title: 'Most stars' },
  { value: 'updated', title: 'Recently updated' },
]

// A health verdict for every result — computed locally, with NO extra requests.
const scored = computed(() =>
  results.value.map((repo) => ({ repo, report: buildHealthReport(repo) })),
)

const pageCount = computed(() =>
  Math.min(Math.ceil(total.value / PER_PAGE), Math.ceil(GITHUB_SEARCH_CAP / PER_PAGE)),
)

// Cancel an in-flight request when a newer one starts, so a slow earlier
// response can't overwrite fresher results.
let controller: AbortController | null = null

async function runSearch(q: string, sortValue: SortField, pageNumber: number) {
  if (!q) return

  controller?.abort()
  controller = new AbortController()
  const { signal } = controller

  loading.value = true
  error.value = ''
  try {
    const res = await searchRepositories({
      q,
      sort: sortValue,
      page: pageNumber,
      perPage: PER_PAGE,
      signal,
    })
    results.value = res.items
    total.value = res.total_count
    incomplete.value = res.incomplete_results
    activeQuery.value = q
    activeSort.value = sortValue
    page.value = pageNumber
    // Share the results so the detail page can suggest healthier matches.
    store.save(res.items, q)
  } catch (e) {
    if (signal.aborted) return // superseded by a newer search — ignore
    error.value = describeError(e)
    results.value = []
    total.value = 0
  } finally {
    if (!signal.aborted) {
      loading.value = false
      searched.value = true
    }
  }
}

function onSearch() {
  runSearch(query.value.trim(), sort.value, 1)
}

function onPage(next: number) {
  runSearch(activeQuery.value, activeSort.value, next)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div>
    <h1 class="text-h4 font-weight-bold mb-6">
      <span class="marker">Find a repository</span>
    </h1>

    <div class="d-flex ga-2 mb-4 flex-wrap align-center">
      <v-text-field
        v-model="query"
        label="Search GitHub repositories"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="comfortable"
        clearable
        hide-details
        style="flex: 1 1 240px"
        @keyup.enter="onSearch"
      />
      <v-select
        v-model="sort"
        :items="sortOptions"
        label="Sort"
        variant="outlined"
        density="comfortable"
        hide-details
        style="max-width: 200px"
      />
      <v-btn color="primary" size="large" :loading="loading" @click="onSearch">Search</v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <div v-else-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="scored.length">
      <p class="text-body-2 text-medium-emphasis mb-3">
        {{ total.toLocaleString('en-US') }} repositories found<span v-if="incomplete">
          — partial results</span
        >
      </p>

      <v-list lines="two">
        <v-list-item
          v-for="{ repo, report } in scored"
          :key="repo.id"
          :to="`/repo/${repo.owner.login}/${repo.name}`"
          :title="repo.full_name"
          :subtitle="repo.description ?? 'No description'"
        >
          <template #prepend>
            <v-icon
              :icon="LEVEL_ICON[report.level]"
              :color="LEVEL_COLOR[report.level]"
              :aria-label="LEVEL_LABEL[report.level]"
              size="small"
              class="mr-2"
            >
              <v-tooltip activator="parent" location="top">{{ report.headline }}</v-tooltip>
            </v-icon>
          </template>
          <template #append>
            <span class="text-caption text-medium-emphasis d-inline-flex align-center ga-1">
              <StarIcon />
              {{ repo.stargazers_count.toLocaleString('en-US') }}
            </span>
          </template>
        </v-list-item>
      </v-list>

      <v-pagination
        v-if="pageCount > 1"
        :model-value="page"
        :length="pageCount"
        :total-visible="7"
        density="comfortable"
        class="mt-4 dep-pagination"
        @update:model-value="onPage"
      />
    </div>

    <v-empty-state
      v-else-if="searched"
      icon="mdi-magnify-remove-outline"
      :title="`Nothing found for “${activeQuery}”`"
      text="Try different keywords or check the spelling."
    />

    <v-empty-state
      v-else
      icon="mdi-magnify"
      title="Search for a repository"
      text="Type a library or project name to see whether it is safe to depend on."
    />
  </div>
</template>

<style scoped>
/* Keep page numbers black; the active page gets a solid lime square (no overlay
   fade) with black text. */
.dep-pagination :deep(.v-pagination__item--is-active .v-btn) {
  background-color: #c8f03c;
  color: #111;
}

.dep-pagination :deep(.v-pagination__item--is-active .v-btn__overlay) {
  opacity: 0;
}
</style>
