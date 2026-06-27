import { z } from 'zod'

// Runtime schemas for the GitHub responses we consume. These are the single
// source of truth: the TypeScript types are inferred from them, so a validated
// response and its static type can't drift apart. zod strips unknown keys, so
// GitHub's much larger payload validates fine.
//
// We deliberately model ONLY the fields the app reads. Validating fields we
// never display would turn a harmless omission by GitHub into a user-facing
// error, so anything non-essential is optional (or simply absent).

const ownerSchema = z.object({
  login: z.string(),
  avatar_url: z.string().optional(),
  html_url: z.string().optional(),
})

const licenseSchema = z.object({
  key: z.string(),
  name: z.string(),
  spdx_id: z.string().nullable(),
})

export const repoSchema = z.object({
  // Read across the UI and the health check — required, so a real shape change
  // (wrong type) still fails loudly.
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  owner: ownerSchema,
  html_url: z.string(),
  description: z.string().nullable(),
  license: licenseSchema.nullable(),
  stargazers_count: z.number(),
  archived: z.boolean(),
  fork: z.boolean(),
  pushed_at: z.string(),
  // Shown only on the detail page — tolerated if GitHub omits them.
  language: z.string().nullable().optional(),
  homepage: z.string().nullable().optional(),
  topics: z.array(z.string()).optional(),
})

export const searchResponseSchema = z.object({
  total_count: z.number(),
  incomplete_results: z.boolean(),
  items: z.array(repoSchema),
})

export type GitHubRepo = z.infer<typeof repoSchema>
export type SearchRepositoriesResponse = z.infer<typeof searchResponseSchema>
