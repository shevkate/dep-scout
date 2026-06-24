// Subset of the GitHub REST API shapes we actually consume. We intentionally
// model only the fields the UI reads — narrower types are easier to keep honest
// under TypeScript strict mode than mirroring GitHub's full payload.

export interface GitHubOwner {
  login: string
  avatar_url: string
  html_url: string
}

export interface GitHubLicense {
  key: string
  name: string
  spdx_id: string | null
}

/**
 * A repository as returned by both `/search/repositories` (items) and
 * `/repos/{owner}/{repo}`. Fields that only exist on the detail endpoint, or
 * that GitHub may omit/null, are marked optional/nullable on purpose — handling
 * those gaps is the whole point of this app.
 */
export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  owner: GitHubOwner
  html_url: string
  description: string | null
  homepage: string | null
  language: string | null
  license: GitHubLicense | null
  topics?: string[]

  stargazers_count: number
  watchers_count: number
  forks_count: number
  open_issues_count: number
  subscribers_count?: number

  archived: boolean
  fork: boolean
  disabled: boolean
  is_template?: boolean

  default_branch: string
  created_at: string
  updated_at: string
  pushed_at: string
}

export interface SearchRepositoriesResponse {
  total_count: number
  incomplete_results: boolean
  items: GitHubRepo[]
}

/** `/repos/{owner}/{repo}/languages` → bytes of code per language. */
export type LanguagesResponse = Record<string, number>

export type SortField = 'best-match' | 'stars' | 'forks' | 'updated'

export interface SearchParams {
  q: string
  page?: number
  perPage?: number
  sort?: SortField
  order?: 'asc' | 'desc'
  signal?: AbortSignal
}
