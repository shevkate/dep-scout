<script setup lang="ts">
import { computed, ref } from 'vue'
import { searchRepositories } from '@/api/github'
import { describeError } from '@/api/errors'
import type { GitHubRepo, SortField } from '@/api/types'
import { buildHealthReport } from '@/lib/health'
import { LEVEL_COLOR, LEVEL_ICON, LEVEL_LABEL } from '@/lib/healthDisplay'
import { useLastSearch } from '@/composables/useLastSearch'
import StarIcon from '@/components/StarIcon.vue'

const { save } = useLastSearch()

const query = ref('')
const sort = ref<SortField>('best-match')
const results = ref<GitHubRepo[]>([])
const incomplete = ref(false) // GitHub flagged the result set as partial
const loading = ref(false)
const error = ref('')
const searched = ref(false) // becomes true after the first search completes
const lastQuery = ref('') // the term actually searched, for the empty state

const sortOptions: { value: SortField; title: string }[] = [
  { value: 'best-match', title: 'Best match' },
  { value: 'stars', title: 'Most stars' },
  { value: 'updated', title: 'Recently updated' },
]

// A health verdict for every result — computed locally, with NO extra requests,
// because the search payload already carries the fields buildHealthReport reads.
const scored = computed(() =>
  results.value.map((repo) => ({ repo, report: buildHealthReport(repo) })),
)

// Cancel an in-flight search when a newer one starts, so a slow earlier response
// can't overwrite fresher results (the classic search race condition).
let controller: AbortController | null = null

async function onSearch() {
  const q = query.value.trim()
  if (!q) return

  controller?.abort()
  controller = new AbortController()
  const { signal } = controller

  loading.value = true
  error.value = ''
  try {
    const res = await searchRepositories({ q, sort: sort.value, perPage: 20, signal })
    results.value = res.items
    incomplete.value = res.incomplete_results
    lastQuery.value = q
    // Share the results so the detail page can suggest healthier matches.
    save(res.items, q)
  } catch (e) {
    if (signal.aborted) return // superseded by a newer search — ignore
    error.value = describeError(e)
    results.value = []
  } finally {
    if (!signal.aborted) {
      loading.value = false
      searched.value = true
    }
  }
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
      <v-alert v-if="incomplete" type="info" variant="tonal" density="compact" class="mb-3">
        GitHub returned a partial result set — some matches may be missing.
      </v-alert>

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
    </div>

    <v-empty-state
      v-else-if="searched"
      icon="mdi-magnify-remove-outline"
      :title="`Nothing found for “${lastQuery}”`"
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
