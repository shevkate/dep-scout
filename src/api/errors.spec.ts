import { describe, it, expect } from 'vitest'
import { describeError, GitHubApiError } from './errors'

describe('describeError', () => {
  it('describes a rate-limit error and includes the reset time', () => {
    const error = new GitHubApiError('rate-limit', 'raw', {
      rateLimitReset: new Date('2026-06-27T14:30:00Z'),
    })
    const message = describeError(error)
    expect(message).toMatch(/rate limit/i)
    expect(message).toMatch(/Resets at/)
  })

  it('maps each error kind to its own message', () => {
    expect(describeError(new GitHubApiError('not-found', 'x'))).toMatch(/not found/i)
    expect(describeError(new GitHubApiError('invalid-query', 'x'))).toMatch(/not valid/i)
    expect(describeError(new GitHubApiError('network', 'x'))).toMatch(/reach GitHub/i)
    expect(describeError(new GitHubApiError('timeout', 'x'))).toMatch(/timed out/i)
  })

  it('falls back to a generic message for non-API errors', () => {
    expect(describeError(new Error('boom'))).toMatch(/something went wrong/i)
    expect(describeError('not even an error')).toMatch(/something went wrong/i)
  })
})
