import { apiGet, apiPost } from '../lib/api'
import type { LiveState, Phase, SimState } from '../types'

// Thin wrappers over the /api/dev endpoints (see server/routes/dev.js).
export const getSimState = () => apiGet<SimState>('/dev/state')
export const getLiveState = () => apiGet<LiveState>('/dev/live-state')

export const setPhase = (phase: Phase) =>
  apiPost<{ ok: boolean; phase: Phase }>('/dev/phase', { phase })

export const draftPick = (playerId: string) =>
  apiPost<{ ok: boolean; botPicks: unknown[]; complete: boolean; error?: string }>(
    '/dev/draft/pick',
    { playerId },
  )

export const fireRandom = (type = 'goal') =>
  apiPost<{ ok: boolean; raw_points?: number; error?: string }>('/dev/live/fire-random', { type })

export const liveStart = () => apiPost<{ ok: boolean; running: boolean }>('/dev/live/start')
export const liveStop = () => apiPost<{ ok: boolean; running: boolean }>('/dev/live/stop')

export const advance = () =>
  apiPost<{ ok: boolean; finalized: number; nextGameweek: number | null }>('/dev/advance')
