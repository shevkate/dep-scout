<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <v-empty-state
    icon="mdi-map-marker-question-outline"
    title="Page not found"
    text="The page you are looking for does not exist."
  >
    <template #actions>
      <v-btn color="primary" @click="router.push('/')">Back to search</v-btn>
    </template>
  </v-empty-state>
</template>
