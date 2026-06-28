import { useQuery } from '@tanstack/react-query'
import { getLiveState } from './simApi'

export const LIVE_STATE_KEY = ['sim', 'live'] as const

// Polls /dev/live-state. refetchInterval replaces the old setInterval poller;
// pass enabled=true only while in LIVE_ACTION so we don't poll needlessly.
export function useLiveState(enabled: boolean) {
  return useQuery({
    queryKey: LIVE_STATE_KEY,
    queryFn: getLiveState,
    enabled,
    refetchInterval: enabled ? 2500 : false,
  })
}
