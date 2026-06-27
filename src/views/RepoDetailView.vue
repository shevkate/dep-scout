<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getRepository } from '@/api/github'
import { describeError, isGitHubApiError } from '@/api/errors'
import { buildHealthReport, type HealthReport } from '@/lib/health'
import { LEVEL_COLOR, LEVEL_ICON, LEVEL_LABEL, STATUS_COLOR, STATUS_ICON } from '@/lib/healthDisplay'
import { storeToRefs } from 'pinia'
import { useSearchStore } from '@/stores/search'
import StarIcon from '@/components/StarIcon.vue'

const props = defineProps<{ owner: string; repo: string }>()

const report = ref<HealthReport | null>(null)
const repoUrl = ref('')
const currentId = ref<number | null>(null)
const loading = ref(true)
const error = ref('')
const notFound = ref(false) // 404 gets its own friendly empty state, not a red alert

const { items: searchItems, query: searchQuery } = storeToRefs(useSearchStore())

// Only suggest matches when this repo actually came from the last search.
const inSearch = computed(
  () => currentId.value !== null && searchItems.value.some((r) => r.id === currentId.value),
)

// Healthier matches from the same search — scored locally, no extra requests.
const alternatives = computed(() => {
  if (!inSearch.value || !report.value) return []
  const currentScore = report.value.score
  return searchItems.value
    .filter((r) => r.id !== currentId.value)
    .map((repo) => ({ repo, report: buildHealthReport(repo) }))
    .filter((a) => a.report.score > currentScore)
    .sort((a, b) => b.report.score - a.report.score)
    .slice(0, 3)
})

// Cancel a previous load when navigating to another repo, so an earlier slow
// response can't replace the current one.
let controller: AbortController | null = null

async function load() {
  controller?.abort()
  controller = new AbortController()
  const { signal } = controller

  loading.value = true
  error.value = ''
  notFound.value = false
  report.value = null
  repoUrl.value = ''
  currentId.value = null
  try {
    const data = await getRepository(props.owner, props.repo, signal)
    repoUrl.value = data.html_url
    currentId.value = data.id
    report.value = buildHealthReport(data)
  } catch (e) {
    if (signal.aborted) return // superseded by a newer navigation — ignore
    notFound.value = isGitHubApiError(e) && e.kind === 'not-found'
    error.value = describeError(e)
  } finally {
    if (!signal.aborted) loading.value = false
  }
}

// `immediate` runs it on mount; the watch also reruns when the route params
// change, so clicking a suggested match reloads the page instead of going stale.
watch(() => [props.owner, props.repo], load, { immediate: true })
</script>

<template>
  <div>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" to="/" class="mb-4">Back to search</v-btn>

    <div class="d-flex align-center mb-4">
      <h1 class="text-h6">{{ owner }}/{{ repo }}</h1>
      <v-btn
        v-if="repoUrl"
        :href="repoUrl"
        target="_blank"
        rel="noopener noreferrer"
        variant="text"
        size="small"
        icon="mdi-open-in-new"
        class="ml-2"
        aria-label="Open on GitHub"
      />
    </div>

    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-empty-state
      v-else-if="notFound"
      icon="mdi-magnify-close"
      :title="`${owner}/${repo} not found`"
      text="This repository does not exist, or it may be private."
    >
      <template #actions>
        <v-btn color="primary" to="/">Back to search</v-btn>
      </template>
    </v-empty-state>

    <v-alert v-else-if="error" type="error" variant="tonal">{{ error }}</v-alert>

    <template v-else-if="report">
      <v-alert :type="LEVEL_COLOR[report.level]" variant="tonal" class="mb-4">
        <strong>{{ report.headline }}</strong>
      </v-alert>

      <v-card variant="outlined">
        <v-list>
          <v-list-item v-for="s in report.signals" :key="s.label">
            <template #prepend>
              <v-icon
                :icon="STATUS_ICON[s.status]"
                :color="STATUS_COLOR[s.status]"
                size="small"
                class="mr-3"
              />
            </template>
            <v-list-item-title>{{ s.label }}: {{ s.value }}</v-list-item-title>
            <v-list-item-subtitle>{{ s.hint }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card>

      <template v-if="inSearch">
        <div v-if="alternatives.length" class="mt-8">
          <h2 class="text-subtitle-1 font-weight-bold mb-2">Healthier matches from your search</h2>
          <v-card variant="outlined">
            <v-list lines="two">
              <v-list-item
                v-for="alt in alternatives"
                :key="alt.repo.id"
                :to="`/repo/${alt.repo.owner.login}/${alt.repo.name}`"
                :title="alt.repo.full_name"
                :subtitle="alt.repo.description ?? 'No description'"
              >
                <template #prepend>
                  <v-icon
                    :icon="LEVEL_ICON[alt.report.level]"
                    :color="LEVEL_COLOR[alt.report.level]"
                    :aria-label="LEVEL_LABEL[alt.report.level]"
                    size="small"
                    class="mr-2"
                  />
                </template>
                <template #append>
                  <span class="text-caption text-medium-emphasis d-inline-flex align-center ga-1">
                    <StarIcon />
                    {{ alt.repo.stargazers_count.toLocaleString('en-US') }}
                  </span>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </div>

        <v-alert v-else type="success" variant="tonal" class="mt-8">
          One of the healthiest matches for “{{ searchQuery }}”.
        </v-alert>
      </template>
    </template>
  </div>
</template>
