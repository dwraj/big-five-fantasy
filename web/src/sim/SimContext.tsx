import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { getSimState } from './simApi'
import type { SimState } from '../types'

// Dev/sim mode is on for localhost or when ?sim is present (matches old index.html).
export const DEV =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('sim'))

export const SIM_STATE_KEY = ['sim', 'state'] as const

interface SimContextValue {
  query: UseQueryResult<SimState>
  sim: SimState | undefined
}

const SimContext = createContext<SimContextValue | null>(null)

export function SimProvider({ children }: { children: ReactNode }) {
  // Fetches /dev/state on mount and on every reload — this is the rehydration
  // that makes HMR safe (AC-5): all sim state lives in the DB.
  const query = useQuery({
    queryKey: SIM_STATE_KEY,
    queryFn: getSimState,
    enabled: DEV,
    staleTime: 0,
  })
  return (
    <SimContext.Provider value={{ query, sim: query.data }}>{children}</SimContext.Provider>
  )
}

export function useSim(): SimContextValue {
  const ctx = useContext(SimContext)
  if (!ctx) throw new Error('useSim must be used within <SimProvider>')
  return ctx
}
