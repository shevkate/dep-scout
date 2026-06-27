<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import ErrorBoundary from '@/components/ErrorBoundary.vue'

const router = useRouter()
</script>

<template>
  <v-app>
    <v-app-bar flat border density="comfortable">
      <v-container class="app-container d-flex align-center py-0">
        <v-app-bar-title
          class="font-weight-bold"
          style="cursor: pointer"
          @click="router.push('/')"
        >
          <v-icon icon="mdi-shield-search" class="mr-2" color="ink" />
          <span class="marker">dep-scout</span>
        </v-app-bar-title>
        <v-spacer />
        <span class="text-caption text-medium-emphasis d-none d-sm-inline">
          Should you depend on this repo?
        </span>
      </v-container>
    </v-app-bar>

    <v-main>
      <v-container class="app-container py-6">
        <ErrorBoundary>
          <RouterView />
        </ErrorBoundary>
      </v-container>
    </v-main>
  </v-app>
</template>
