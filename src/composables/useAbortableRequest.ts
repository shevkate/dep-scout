import { ref } from 'vue'

type RunResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'error'; error: unknown }
  | { status: 'superseded' } // a newer call started before this one finished

// Runs one async request at a time: starting a new call aborts the previous one
// and marks its result `superseded` so the caller ignores it. This is the single
// definition of the "cancel the stale request" pattern that both the search
// store and the detail view reuse, instead of copy-pasting the control flow.
export function useAbortableRequest() {
  const loading = ref(false)
  let controller: AbortController | null = null

  async function run<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<RunResult<T>> {
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller
    loading.value = true
    try {
      return { status: 'ok', data: await fn(signal) }
    } catch (error) {
      if (signal.aborted) return { status: 'superseded' }
      return { status: 'error', error }
    } finally {
      // Only the latest call owns the loading flag; a superseded one leaves it
      // to the request that replaced it.
      if (!signal.aborted) loading.value = false
    }
  }

  return { loading, run }
}
