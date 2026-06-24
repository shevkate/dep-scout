<script setup lang="ts">
import { onErrorCaptured, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

// A safety net for the *unexpected*: if any child component throws during
// render, we show a fallback instead of letting the screen go blank.
// (Expected API failures are handled separately via describeError.)

const failed = ref(false)
const route = useRoute()

onErrorCaptured((err) => {
  failed.value = true
  console.error('[ErrorBoundary] Unexpected UI error:', err)
  return false // stop the error from propagating further
})

// Recover automatically once the user navigates somewhere else.
watch(
  () => route.fullPath,
  () => {
    failed.value = false
  },
)

function reload() {
  window.location.reload()
}
</script>

<template>
  <v-empty-state
    v-if="failed"
    icon="mdi-alert-circle-outline"
    title="Something went wrong"
    text="An unexpected error occurred. Try reloading the page."
  >
    <template #actions>
      <v-btn color="primary" @click="reload">Reload</v-btn>
    </template>
  </v-empty-state>
  <slot v-else />
</template>
