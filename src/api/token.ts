// Optional GitHub personal access token (PAT).
//
// The app works fully unauthenticated (60 requests/hour). A token raises the
// limit to 5000/hour. We accept a token at runtime and keep it in localStorage
// so a reload doesn't lose it.
//
// Trade-off, stated plainly: a token in localStorage is readable by any script
// running on the page (XSS). For a public, read-only, no-backend client that
// only ever needs a fine-grained, read-only *public* token, this is an
// acceptable convenience. We never commit a token and never send it anywhere
// except api.github.com. This is documented in the README.

const STORAGE_KEY = 'dep-scout:gh-token'

// A build-time fallback (e.g. for the deployed demo). Optional.
const ENV_TOKEN = (import.meta.env.VITE_GITHUB_TOKEN as string | undefined)?.trim() ?? ''

function fromStorage(): string {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() ?? ''
  } catch {
    // localStorage can throw (private mode, disabled storage) — degrade quietly.
    return ''
  }
}

export function getToken(): string {
  return fromStorage() || ENV_TOKEN
}

export function hasToken(): boolean {
  return getToken().length > 0
}

export function setToken(token: string): void {
  try {
    const trimmed = token.trim()
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ignore so running without persistence is fine.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}
