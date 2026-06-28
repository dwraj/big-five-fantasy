import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SimProvider, useSim } from './SimContext'
import type { SimState } from '../types'

const fakeState: SimState = {
  phase: 'DRAFTING',
  leagueId: 'L1',
  humanTeamId: 'T1',
  teams: [{ id: 'T1', name: 'My Team' }],
  liveSimRunning: false,
  activeGameweek: null,
  draft: { status: 'active', round: 3, pick: 17, onClockTeamId: 'T1', isMyTurn: true, complete: false },
}

vi.mock('./simApi', () => ({
  getSimState: vi.fn(async () => fakeState),
}))

function Probe() {
  const { sim } = useSim()
  if (!sim) return <span>loading</span>
  return <span>{`phase=${sim.phase} round=${sim.draft?.round}`}</span>
}

describe('SimProvider / useSim', () => {
  it('rehydrates sim state from the dev API on mount', async () => {
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <SimProvider>
          <Probe />
        </SimProvider>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByText('phase=DRAFTING round=3')).toBeInTheDocument())
  })
})
