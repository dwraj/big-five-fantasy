import { useQueryClient } from '@tanstack/react-query'
import { SIM_STATE_KEY } from './SimContext'
import { LIVE_STATE_KEY } from './useLiveState'
import * as simApi from './simApi'
import type { Phase } from '../types'

// Action helpers that hit the dev API then invalidate the affected queries so
// the UI re-renders from fresh DB state (replaces the old manual re-render calls).
export function useSimActions() {
  const qc = useQueryClient()
  const refreshState = () => qc.invalidateQueries({ queryKey: SIM_STATE_KEY })
  const refreshLive = () => qc.invalidateQueries({ queryKey: LIVE_STATE_KEY })

  return {
    async setPhase(phase: Phase) {
      await simApi.setPhase(phase)
      await refreshState()
    },
    async draftPick(playerId: string) {
      const res = await simApi.draftPick(playerId)
      await refreshState()
      return res
    },
    async fireRandom(type = 'goal') {
      const res = await simApi.fireRandom(type)
      await refreshLive()
      return res
    },
    async liveStart() {
      await simApi.liveStart()
      await refreshState()
      await refreshLive()
    },
    async liveStop() {
      await simApi.liveStop()
      await refreshState()
    },
    async advance() {
      await simApi.advance()
      await refreshState()
      await refreshLive()
    },
  }
}
