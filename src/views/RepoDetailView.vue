<script setup lang="ts">
defineProps<{ owner: string; repo: string }>()
</script>

<template>
  <div>
    <h1 class="text-h6">{{ owner }}/{{ repo }}</h1>
    <p class="text-body-2 text-medium-emphasis">Health panel coming up next.</p>
  </div>
</template>
