import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Draft } from './Draft'
import type { DraftSession, Player, SimState } from '../types'

const sim: SimState = {
  phase: 'DRAFTING',
  leagueId: 'L1',
  humanTeamId: 'T1',
  teams: [
    { id: 'T1', name: 'My Team' },
    { id: 'T2', name: 'Bot 1' },
  ],
  liveSimRunning: false,
  activeGameweek: null,
  draft: { status: 'active', round: 1, pick: 3, onClockTeamId: 'T1', isMyTurn: true, complete: false },
}

const draft: DraftSession = {
  id: 'D1', league_id: 'L1', status: 'active', current_round: 1, current_pick: 3,
  draft_order: [
    { id: 'o1', team_id: 'T1', slot: 1 },
    { id: 'o2', team_id: 'T2', slot: 2 },
  ],
  draft_picks: [
    { id: 'p1', team_id: 'T1', player_id: 'P1', round: 1, pick_number: 1, is_auto: false, picked_at: '' },
    { id: 'p2', team_id: 'T2', player_id: 'P2', round: 1, pick_number: 2, is_auto: true, picked_at: '' },
  ],
}

const players: Player[] = [
  { id: 'P1', external_api_id: '1', name: 'M. Salah', position: 'F', club_id: 1, league_api_id: 39, nationality: null, status: 'active', image_url: null, form: null, season_points: 100, ownership_pct: null },
  { id: 'P2', external_api_id: '2', name: 'E. Haaland', position: 'F', club_id: 2, league_api_id: 39, nationality: null, status: 'active', image_url: null, form: null, season_points: 90, ownership_pct: null },
  { id: 'P3', external_api_id: '3', name: 'K. De Bruyne', position: 'M', club_id: 2, league_api_id: 39, nationality: null, status: 'active', image_url: null, form: null, season_points: 80, ownership_pct: null },
]

const draftPick = vi.fn(async () => ({ ok: true, botPicks: [], complete: false }))

vi.mock('../sim/SimContext', () => ({
  DEV: true,
  useSim: () => ({ sim, query: {} }),
}))
vi.mock('../sim/useSimActions', () => ({ useSimActions: () => ({ draftPick }) }))
vi.mock('../lib/api', async (orig) => {
  const actual = await orig<typeof import('../lib/api')>()
  return {
    ...actual,
    apiGet: vi.fn(async (endpoint: string) => {
      if (endpoint.startsWith('/drafts')) return draft
      if (endpoint === '/players') return players
      throw new Error(`unexpected ${endpoint}`)
    }),
  }
})

function renderDraft() {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <Draft />
    </QueryClientProvider>,
  )
}

describe('Draft board', () => {
  beforeEach(() => draftPick.mockClear())

  it('renders picks into the snake grid and an available list', async () => {
    renderDraft()
    // Board cells render "name<br>POS", so match by regex substring.
    await waitFor(() => expect(screen.getByText(/M\. Salah/)).toBeInTheDocument())
    expect(screen.getByText(/E\. Haaland/)).toBeInTheDocument()
    // P3 is undrafted -> appears as an available pick option
    expect(screen.getByText('Your turn — pick a player')).toBeInTheDocument()
    expect(screen.getByText('K. De Bruyne')).toBeInTheDocument()
  })

  it('clicking an available player drafts them', async () => {
    renderDraft()
    const user = userEvent.setup()
    await waitFor(() => expect(screen.getByText('K. De Bruyne')).toBeInTheDocument())
    await user.click(screen.getByText('K. De Bruyne'))
    await waitFor(() => expect(draftPick).toHaveBeenCalledWith('P3'))
  })
})
