// API response types for the surface the frontend actually uses.

export type Position = 'G' | 'D' | 'M' | 'F'

export type Phase =
  | 'PRE_SEASON'
  | 'DRAFTING'
  | 'LIVE_ACTION'
  | 'MID_WEEK'
  | 'POST_SEASON'

export interface Player {
  id: string
  external_api_id: string | null
  name: string
  position: Position
  club_id: number | null
  league_api_id: number | null
  nationality: string | null
  status: string
  image_url: string | null
  form: number | null
  season_points: number | null
  ownership_pct: number | null
  // Convenience fields used by the dashboard cards (may be absent in the API).
  club?: string
  league?: string
}

export interface Team {
  id: string
  league_id: string
  user_id: string
  name: string
  logo_url?: string | null
  wins: number
  losses: number
  gameweek_points: number
  total_points: number
}

export interface Gameweek {
  id: string
  league_id: string
  number: number
  start_date: string | null
  end_date: string | null
  deadline: string | null
  status: 'upcoming' | 'active' | 'complete'
}

export interface DraftPick {
  id: string
  team_id: string
  player_id: string
  round: number
  pick_number: number
  is_auto: boolean
  picked_at: string
}

export interface DraftOrderSlot {
  id: string
  team_id: string
  slot: number
}

export interface DraftSession {
  id: string
  league_id: string
  status: 'pending' | 'active' | 'paused' | 'complete'
  current_round: number
  current_pick: number
  draft_picks: DraftPick[]
  draft_order: DraftOrderSlot[]
}

export interface Matchup {
  id: string
  home_team_id: string
  away_team_id: string
  home_score: number
  away_score: number
  status: 'upcoming' | 'active' | 'complete'
  winner_team_id?: string | null
}

// ── Sim/dev API shapes ──────────────────────────────────────────────────────

export interface SimDraftState {
  status: string
  round: number
  pick: number
  onClockTeamId: string | null
  isMyTurn: boolean
  complete: boolean
}

export interface SimState {
  phase: Phase
  leagueId: string
  humanTeamId: string | null
  teams: Pick<Team, 'id' | 'name'>[]
  liveSimRunning: boolean
  activeGameweek: Gameweek | null
  draft: SimDraftState | null
}

export interface LiveState {
  gameweek: Gameweek | null
  matchups: Matchup[]
  teams: Pick<Team, 'id' | 'name' | 'total_points'>[]
  liveSimRunning: boolean
}
