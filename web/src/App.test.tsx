import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import type { SimState } from './types'

const fakeState: SimState = {
  phase: 'PRE_SEASON',
  leagueId: 'L1',
  humanTeamId: 'T1',
  teams: [{ id: 'T1', name: 'My Team' }],
  liveSimRunning: false,
  activeGameweek: { id: 'g1', league_id: 'L1', number: 1, start_date: null, end_date: null, deadline: null, status: 'active' },
  draft: null,
}

const setPhase = vi.fn(async (_phase: string) => ({ ok: true, phase: 'DRAFTING' as const }))

vi.mock('./sim/simApi', () => ({
  getSimState: vi.fn(async () => fakeState),
  getLiveState: vi.fn(async () => ({ gameweek: null, matchups: [], teams: [], liveSimRunning: false })),
  setPhase: (p: unknown) => setPhase(p as never),
  liveStart: vi.fn(),
  liveStop: vi.fn(),
  advance: vi.fn(),
  fireRandom: vi.fn(),
  draftPick: vi.fn(),
}))

function renderApp() {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App layout + DevPanel', () => {
  beforeEach(() => setPhase.mockClear())

  it('renders sidebar, nav, and dev panel', async () => {
    renderApp()
    expect(screen.getByText('Big Five Fantasy')).toBeInTheDocument()
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.getByText('🧪 SIM')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText(/phase=PRE_SEASON/)).toBeInTheDocument())
  })

  it('phase button calls the dev API', async () => {
    renderApp()
    const user = userEvent.setup()
    await waitFor(() => expect(screen.getByText('🧪 SIM')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'DRAFTING' }))
    await waitFor(() => expect(setPhase).toHaveBeenCalledWith('DRAFTING'))
  })
})
