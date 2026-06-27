<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { DEFAULT_PER_PAGE, SEARCH_RESULT_CAP } from '@/api/github'
import type { SortField } from '@/api/types'
import { buildHealthReport, type ScoredRepo } from '@/lib/health'
import { LEVEL_COLOR, LEVEL_ICON, LEVEL_LABEL } from '@/lib/healthDisplay'
import { useSearchStore } from '@/stores/search'
import StarIcon from '@/components/StarIcon.vue'

const store = useSearchStore()
const { items, total, incomplete, loading, error, searched } = storeToRefs(store)
const { query: appliedQuery, sort: appliedSort, page } = storeToRefs(store)

// Live form inputs. Hydrated from the applied state so returning to the search
// screen shows the last query/sort instead of an empty box.
const queryInput = ref(appliedQuery.value)
const sortInput = ref<SortField>(appliedSort.value)

const sortOptions: { value: SortField; title: string }[] = [
  { value: 'best-match', title: 'Best match' },
  { value: 'stars', title: 'Most stars' },
  { value: 'updated', title: 'Recently updated' },
]

// A health verdict for every result — computed locally, with NO extra requests.
const scored = computed<ScoredRepo[]>(() =>
  items.value.map((repo) => ({ repo, report: buildHealthReport(repo) })),
)

const pageCount = computed(() =>
  Math.min(
    Math.ceil(total.value / DEFAULT_PER_PAGE),
    Math.ceil(SEARCH_RESULT_CAP / DEFAULT_PER_PAGE),
  ),
)

// GitHub reports the real total but only serves the first 1000, so say so
// honestly rather than implying you can browse millions.
const resultSummary = computed(() => {
  const found = total.value.toLocaleString('en-US')
  if (total.value > SEARCH_RESULT_CAP) {
    return `Showing the first ${SEARCH_RESULT_CAP.toLocaleString('en-US')} of ${found} repositories`
  }
  return `${found} repositories found`
})

function onSearch() {
  store.search(queryInput.value.trim(), sortInput.value, 1)
}

function onPage(next: number) {
  store.search(appliedQuery.value, appliedSort.value, next)
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
        v-model="queryInput"
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
        v-model="sortInput"
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
        {{ resultSummary }}<span v-if="incomplete"> — partial results</span>
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
      :title="`Nothing found for “${appliedQuery}”`"
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
   fade) with black text. The lime comes from a shared brand token. */
.dep-pagination :deep(.v-pagination__item--is-active .v-btn) {
  background-color: var(--brand-lime);
  color: #111;
}

.dep-pagination :deep(.v-pagination__item--is-active .v-btn__overlay) {
  opacity: 0;
}
</style>
