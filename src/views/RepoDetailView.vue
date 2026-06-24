<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getRepository } from '@/api/github'
import { isGitHubApiError } from '@/api/errors'
import { buildHealthReport, type HealthReport, type SignalStatus, type VerdictLevel } from '@/lib/health'

const props = defineProps<{ owner: string; repo: string }>()

const report = ref<HealthReport | null>(null)
const repoUrl = ref('')
const loading = ref(true)
const error = ref('')

// Map our domain statuses to Vuetify colour names. Typing the values as the
// exact union v-alert expects means no cast is needed in the template.
type AlertType = 'success' | 'warning' | 'error'

const levelColor: Record<VerdictLevel, AlertType> = {
  healthy: 'success',
  caution: 'warning',
  risky: 'error',
}
const statusColor: Record<SignalStatus, string> = {
  good: 'success',
  warn: 'warning',
  bad: 'error',
  neutral: 'grey',
}

onMounted(async () => {
  try {
    const data = await getRepository(props.owner, props.repo)
    repoUrl.value = data.html_url
    report.value = buildHealthReport(data)
  } catch (e) {
    error.value = isGitHubApiError(e) ? e.message : 'Something went wrong.'
  } finally {
    loading.value = false
  }
})
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
        variant="text"
        size="small"
        icon="mdi-open-in-new"
        class="ml-2"
      />
    </div>

    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-alert v-else-if="error" type="error" variant="tonal">{{ error }}</v-alert>

    <template v-else-if="report">
      <v-alert :type="levelColor[report.level]" variant="tonal" class="mb-4">
        <strong>{{ report.headline }}</strong>
      </v-alert>

      <v-card variant="outlined">
        <v-list>
          <v-list-item v-for="s in report.signals" :key="s.label">
            <template #prepend>
              <v-icon :color="statusColor[s.status]" icon="mdi-circle" size="x-small" class="mr-3" />
            </template>
            <v-list-item-title>{{ s.label }}: {{ s.value }}</v-list-item-title>
            <v-list-item-subtitle>{{ s.hint }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card>
    </template>
  </div>
</template>
