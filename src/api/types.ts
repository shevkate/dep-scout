// The response shapes are inferred from the zod schemas (single source of truth,
// see schemas.ts). Request-side types that have no runtime schema live here.

export type { GitHubRepo, SearchRepositoriesResponse } from './schemas'

export type SortField = 'best-match' | 'stars' | 'updated'

export interface SearchParams {
  q: string
  page?: number
  perPage?: number
  sort?: SortField
  order?: 'asc' | 'desc'
  signal?: AbortSignal
}
