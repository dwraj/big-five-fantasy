import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolveApiBase, apiGet, apiPost, ApiError } from './api'

describe('resolveApiBase', () => {
  it('prefers VITE_API_URL and strips trailing slash', () => {
    expect(resolveApiBase({ VITE_API_URL: 'https://x.dev/api/' }, 'anything')).toBe(
      'https://x.dev/api',
    )
  })

  it('uses relative /api in dev', () => {
    expect(resolveApiBase({ DEV: true }, 'localhost')).toBe('/api')
  })

  it('routes the canonical Vercel host to prod Railway', () => {
    expect(resolveApiBase({}, 'big-five-fantasy.vercel.app')).toContain('production')
  })

  it('routes localhost (built, no env) to the local backend', () => {
    expect(resolveApiBase({}, 'localhost')).toBe('http://localhost:3001/api')
  })

  it('falls back to test Railway for unknown hosts', () => {
    expect(resolveApiBase({}, 'big-five-fantasy-abc.vercel.app')).toContain('test')
  })
})

describe('apiGet/apiPost', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('apiGet returns parsed JSON on ok', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ hello: 'world' }),
    })
    await expect(apiGet('/x')).resolves.toEqual({ hello: 'world' })
  })

  it('apiGet throws ApiError on non-ok', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 })
    await expect(apiGet('/x')).rejects.toBeInstanceOf(ApiError)
  })

  it('apiPost sends a JSON body', async () => {
    const f = fetch as ReturnType<typeof vi.fn>
    f.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    await apiPost('/y', { a: 1 })
    expect(f).toHaveBeenCalledWith(
      expect.stringContaining('/y'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ a: 1 }) }),
    )
  })
})
