import { z } from 'zod'

// Runtime schemas for the GitHub responses we consume. These are the single
// source of truth: the TypeScript types below are inferred from them, so a
// validated response and its static type can never drift apart. zod strips
// unknown keys, so GitHub's much larger payload validates fine — we only assert
// the fields we actually read.

const ownerSchema = z.object({
  login: z.string(),
  avatar_url: z.string(),
  html_url: z.string(),
})

const licenseSchema = z.object({
  key: z.string(),
  name: z.string(),
  spdx_id: z.string().nullable(),
})

export const repoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  owner: ownerSchema,
  html_url: z.string(),
  description: z.string().nullable(),
  homepage: z.string().nullable(),
  language: z.string().nullable(),
  license: licenseSchema.nullable(),
  topics: z.array(z.string()).optional(),
  stargazers_count: z.number(),
  watchers_count: z.number(),
  forks_count: z.number(),
  open_issues_count: z.number(),
  subscribers_count: z.number().optional(),
  archived: z.boolean(),
  fork: z.boolean(),
  disabled: z.boolean(),
  is_template: z.boolean().optional(),
  default_branch: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  pushed_at: z.string(),
})

export const searchResponseSchema = z.object({
  total_count: z.number(),
  incomplete_results: z.boolean(),
  items: z.array(repoSchema),
})

export type GitHubRepo = z.infer<typeof repoSchema>
export type SearchRepositoriesResponse = z.infer<typeof searchResponseSchema>
