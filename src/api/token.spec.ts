import { describe, it, expect, beforeEach } from 'vitest'
import { getToken, hasToken, setToken, clearToken } from './token'

describe('token storage', () => {
  beforeEach(() => clearToken())

  it('round-trips a token through localStorage, trimmed', () => {
    expect(hasToken()).toBe(false)
    setToken('  ghp_abc  ')
    expect(getToken()).toBe('ghp_abc')
    expect(hasToken()).toBe(true)
  })

  it('clears the token', () => {
    setToken('ghp_x')
    clearToken()
    expect(getToken()).toBe('')
    expect(hasToken()).toBe(false)
  })

  it('treats a blank token as no token', () => {
    setToken('   ')
    expect(hasToken()).toBe(false)
  })
})
