<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { searchRepositories } from '@/api/github'
import { describeError } from '@/api/errors'
import type { GitHubRepo, SortField } from '@/api/types'
import { buildHealthReport, type VerdictLevel } from '@/lib/health'
import { useLastSearch } from '@/composables/useLastSearch'
import StarIcon from '@/components/StarIcon.vue'

const router = useRouter()
const { save } = useLastSearch()

const query = ref('')
const sort = ref<SortField>('best-match')
const results = ref<GitHubRepo[]>([])
const loading = ref(false)
const error = ref('')
const searched = ref(false) // becomes true after the first search completes
const lastQuery = ref('') // the term actually searched, for the empty state

const sortOptions: { value: SortField; title: string }[] = [
  { value: 'best-match', title: 'Best match' },
  { value: 'stars', title: 'Most stars' },
  { value: 'updated', title: 'Recently updated' },
]

const levelColor: Record<VerdictLevel, string> = {
  healthy: 'success',
  caution: 'warning',
  risky: 'error',
}

// A health verdict for every result — computed locally, with NO extra requests,
// because the search payload already carries the fields buildHealthReport reads.
const scored = computed(() =>
  results.value.map((repo) => ({ repo, report: buildHealthReport(repo) })),
)

async function onSearch() {
  const q = query.value.trim()
  if (!q) return

  loading.value = true
  error.value = ''
  try {
    const res = await searchRepositories({ q, sort: sort.value, perPage: 20 })
    results.value = res.items
    lastQuery.value = q
    // Share the results so the detail page can suggest healthier matches.
    save(res.items, q)
  } catch (e) {
    error.value = describeError(e)
    results.value = []
  } finally {
    loading.value = false
    searched.value = true
  }
}

function openRepo(repo: GitHubRepo) {
  router.push(`/repo/${repo.owner.login}/${repo.name}`)
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

    <v-list v-else-if="scored.length" lines="two">
      <v-list-item
        v-for="{ repo, report } in scored"
        :key="repo.id"
        :title="repo.full_name"
        :subtitle="repo.description ?? 'No description'"
        @click="openRepo(repo)"
      >
        <template #prepend>
          <v-icon :color="levelColor[report.level]" icon="mdi-circle" size="small" class="mr-2">
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
