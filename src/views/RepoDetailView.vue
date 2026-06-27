<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getRepository } from '@/api/github'
import { describeError, isGitHubApiError } from '@/api/errors'
import { buildHealthReport, pickAlternatives, type HealthReport } from '@/lib/health'
import type { GitHubRepo } from '@/api/types'
import { LEVEL_COLOR, LEVEL_ICON, LEVEL_LABEL, STATUS_COLOR, STATUS_ICON } from '@/lib/healthDisplay'
import { storeToRefs } from 'pinia'
import { useSearchStore } from '@/stores/search'
import { useAbortableRequest } from '@/composables/useAbortableRequest'
import StarIcon from '@/components/StarIcon.vue'

const props = defineProps<{ owner: string; repo: string }>()

const report = ref<HealthReport | null>(null)
const detail = ref<GitHubRepo | null>(null)
const repoUrl = ref('')
const currentId = ref<number | null>(null)
const error = ref('')
const notFound = ref(false) // 404 gets its own friendly empty state, not a red alert

const { loading, run } = useAbortableRequest()
const { items: searchItems, query: searchQuery } = storeToRefs(useSearchStore())

// Only suggest matches when this repo actually came from the last search.
const inSearch = computed(
  () => currentId.value !== null && searchItems.value.some((r) => r.id === currentId.value),
)

// Healthier matches from the same results — scored locally, no extra requests.
const alternatives = computed(() =>
  inSearch.value && report.value && currentId.value !== null
    ? pickAlternatives(searchItems.value, currentId.value, report.value.score)
    : [],
)

// The owner-provided homepage often lacks a protocol ("vuejs.org"); make it a
// safe absolute URL so the link doesn't resolve relative to our own site.
const homepageUrl = computed(() => {
  const h = detail.value?.homepage?.trim()
  if (!h) return ''
  return /^https?:\/\//i.test(h) ? h : `https://${h}`
})

async function load() {
  error.value = ''
  notFound.value = false
  report.value = null
  detail.value = null
  repoUrl.value = ''
  currentId.value = null

  // run() cancels any previous in-flight load, so navigating between repos can't
  // land a stale response.
  const result = await run((signal) => getRepository(props.owner, props.repo, signal))
  if (result.status === 'superseded') return

  if (result.status === 'error') {
    notFound.value = isGitHubApiError(result.error) && result.error.kind === 'not-found'
    error.value = describeError(result.error)
    return
  }

  const data = result.data
  detail.value = data
  repoUrl.value = data.html_url
  currentId.value = data.id
  report.value = buildHealthReport(data)
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
      <p v-if="detail?.description" class="text-body-1 mb-3">{{ detail.description }}</p>

      <div v-if="detail?.language || homepageUrl" class="d-flex ga-4 align-center mb-5">
        <v-chip v-if="detail?.language" size="small" variant="tonal" color="primary">
          {{ detail.language }}
        </v-chip>
        <a
          v-if="homepageUrl"
          :href="homepageUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-caption d-inline-flex align-center"
        >
          <v-icon icon="mdi-web" size="small" class="mr-1" />Homepage
        </a>
      </div>

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
          <h2 class="text-subtitle-1 font-weight-bold mb-2">Healthier matches from these results</h2>
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
          One of the healthiest results for “{{ searchQuery }}”.
        </v-alert>
      </template>
    </template>
  </div>
</template>
