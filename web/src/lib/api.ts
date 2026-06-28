// Typed API client. Ports fetchAPI/postAPI from the old index.html.
//
// Base URL resolution (in priority order):
//   1. VITE_API_URL env var (set per Vercel environment: prod vs preview).
//   2. In dev, relative `/api` — Vite proxies it to the backend on :3001.
//   3. In a built app with no env var, fall back to the hostname switch the
//      old frontend used (prod Railway for the canonical host, else test).

const PROD_API = 'https://big-five-fantasy-production.up.railway.app/api'
const TEST_API = 'https://big-five-fantasy-test.up.railway.app/api'

export function resolveApiBase(
  env: { VITE_API_URL?: string; DEV?: boolean } = import.meta.env,
  hostname: string = typeof window !== 'undefined' ? window.location.hostname : '',
): string {
  if (env.VITE_API_URL) return env.VITE_API_URL.replace(/\/$/, '')
  if (env.DEV) return '/api'
  if (hostname === 'big-five-fantasy.vercel.app') return PROD_API
  if (hostname === 'localhost') return 'http://localhost:3001/api'
  return TEST_API
}

const BASE = resolveApiBase()

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE}${endpoint}`)
  if (!res.ok) throw new ApiError(res.status, `GET ${endpoint} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export async function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) throw new ApiError(res.status, `POST ${endpoint} failed: ${res.status}`)
  return res.json() as Promise<T>
}
