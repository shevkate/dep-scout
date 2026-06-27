<script setup lang="ts">
import { ref } from 'vue'
import { hasToken, setToken, clearToken } from '@/api/token'

const open = ref(false)
const input = ref('')
const saved = ref(hasToken())

function openDialog() {
  input.value = ''
  open.value = true
}

function save() {
  setToken(input.value)
  // Reflect the real auth state (which also covers a build-time env token),
  // not just whether this field had text.
  saved.value = hasToken()
  open.value = false
}

function remove() {
  clearToken()
  saved.value = hasToken()
  input.value = ''
  open.value = false
}
</script>

<template>
  <v-btn
    :variant="saved ? 'tonal' : 'text'"
    :color="saved ? 'primary' : undefined"
    size="small"
    prepend-icon="mdi-key-variant"
    @click="openDialog"
  >
    {{ saved ? 'Token set' : 'Add token' }}
  </v-btn>

  <v-dialog v-model="open" max-width="460">
    <v-card title="GitHub token (optional)">
      <v-card-text>
        <p class="text-body-2 mb-4">
          Unauthenticated search is capped at 10 requests/min. A read-only personal
          access token raises that to 30/min. It is stored only in your browser
          (localStorage) and sent only to api.github.com.
        </p>
        <v-text-field
          v-model="input"
          label="Personal access token"
          type="password"
          variant="outlined"
          density="comfortable"
          autocomplete="off"
          hide-details
          class="mb-2"
        />
        <a
          href="https://github.com/settings/personal-access-tokens/new"
          target="_blank"
          rel="noopener noreferrer"
          class="text-caption"
        >
          Create a fine-grained, read-only token →
        </a>
      </v-card-text>
      <v-card-actions>
        <v-btn v-if="saved" color="error" variant="text" @click="remove">Remove</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" variant="flat" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
