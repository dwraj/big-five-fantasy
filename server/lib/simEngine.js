import { getSupabaseAdmin } from './supabase.js';
import { computePlayerScore, getDefaultScoringSettings } from './scoring.js';

const supabase = getSupabaseAdmin();
let liveTimer = null;

const simFixtureId = (gwNumber) => 99000 + gwNumber;

const EVENT_EFFECTS = {
  goal:        s => ({ goals: (s.goals || 0) + 1 }),
  assist:      s => ({ assists: (s.assists || 0) + 1 }),
  save:        s => ({ saves: (s.saves || 0) + 1 }),
  yellow_card: s => ({ yellow_cards: (s.yellow_cards || 0) + 1 }),
  red_card:    s => ({ red_cards: (s.red_cards || 0) + 1 }),
  minutes:     s => ({ minutes: Math.min(90, (s.minutes || 0) + 15) }),
};

export async function getActiveGameweek(leagueId) {
  const { data } = await supabase.from('gameweeks').select('*')
    .eq('league_id', leagueId).eq('status', 'active').order('number').limit(1);
  return data?.[0] || null;
}

async function ensureSimFixture(gwNumber) {
  const id = simFixtureId(gwNumber);
  const { data: existing } = await supabase.from('fixtures').select('id').eq('id', id).maybeSingle();
  if (existing) return id;
  const { data: clubs } = await supabase.from('clubs').select('id, league_api_id, season').limit(2);
  await supabase.from('fixtures').insert({
    id,
    league_api_id: clubs?.[0]?.league_api_id ?? null,
    season: clubs?.[0]?.season ?? null,
    home_club_id: clubs?.[0]?.id ?? null,
    away_club_id: clubs?.[1]?.id ?? null,
    kickoff_at: new Date().toISOString(),
    status: 'LIVE',
    gameweek_number: gwNumber,
  });
  return id;
}

export async function generateLineups(leagueId, gameweek) {
  const { data: teams } = await supabase.from('teams').select('id').eq('league_id', leagueId);
  for (const t of teams || []) {
    const { data: roster } = await supabase.from('rosters')
      .select('player_id').eq('team_id', t.id);
    const rows = (roster || []).map((r, idx) => ({
      team_id: t.id, gameweek_id: gameweek.id, player_id: r.player_id,
      is_starter: idx < 11,
    }));
    if (rows.length) {
      await supabase.from('lineups')
        .upsert(rows, { onConflict: 'team_id,gameweek_id,player_id' });
    }
  }
}

export async function initLiveStats(leagueId, gameweek) {
  const fixtureId = await ensureSimFixture(gameweek.number);
  const { data: starters } = await supabase.from('lineups')
    .select('player_id, teams!inner(league_id)')
    .eq('gameweek_id', gameweek.id).eq('is_starter', true)
    .eq('teams.league_id', leagueId);
  const seen = new Set();
  const rows = [];
  for (const s of starters || []) {
    if (seen.has(s.player_id)) continue;
    seen.add(s.player_id);
    rows.push({
      player_id: s.player_id, gameweek_id: gameweek.id, fixture_id: fixtureId,
      minutes: 0, goals: 0, assists: 0, saves: 0,
      yellow_cards: 0, red_cards: 0, own_goals: 0,
      penalty_missed: 0, penalty_scored: 0, bonus_pts: 0,
      raw_points: 0, is_live: true,
    });
  }
  if (rows.length) {
    await supabase.from('player_stats')
      .upsert(rows, { onConflict: 'player_id,fixture_id' });
  }
  return fixtureId;
}

export async function fireEvent(leagueId, playerId, type) {
  const gw = await getActiveGameweek(leagueId);
  if (!gw) return { ok: false, error: 'No active gameweek' };
  const effect = EVENT_EFFECTS[type];
  if (!effect) return { ok: false, error: `Unknown event type: ${type}` };

  const fixtureId = await ensureSimFixture(gw.number);
  const { data: stat } = await supabase.from('player_stats').select('*')
    .eq('player_id', playerId).eq('fixture_id', fixtureId).maybeSingle();
  const base = stat || {
    player_id: playerId, gameweek_id: gw.id, fixture_id: fixtureId,
    minutes: 0, goals: 0, assists: 0, saves: 0,
    yellow_cards: 0, red_cards: 0, own_goals: 0,
    penalty_missed: 0, penalty_scored: 0, bonus_pts: 0,
    raw_points: 0, is_live: true,
  };

  const merged = { ...base, ...effect(base) };
  const { data: player } = await supabase.from('players')
    .select('position').eq('id', playerId).single();

  const settings = await getLeagueScoringSettings(leagueId);
  merged.raw_points = computePlayerScore({ ...merged, position: player?.position }, settings);

  await supabase.from('player_stats')
    .upsert(merged, { onConflict: 'player_id,fixture_id' });
  await recomputeMatchupScores(gw.id);
  return { ok: true, raw_points: merged.raw_points };
}

export async function getLeagueScoringSettings(leagueId) {
  const { data } = await supabase.from('leagues')
    .select('scoring_settings').eq('id', leagueId).single();
  return data?.scoring_settings || getDefaultScoringSettings();
}

async function teamGwScore(teamId, gameweekId) {
  const { data: lineup } = await supabase.from('lineups')
    .select('player_id').eq('team_id', teamId)
    .eq('gameweek_id', gameweekId).eq('is_starter', true);
  const ids = (lineup || []).map(l => l.player_id);
  if (!ids.length) return 0;
  const { data: stats } = await supabase.from('player_stats')
    .select('raw_points').in('player_id', ids).eq('gameweek_id', gameweekId);
  return (stats || []).reduce((sum, s) => sum + (s.raw_points || 0), 0);
}

export async function recomputeMatchupScores(gameweekId) {
  const { data: matchups } = await supabase.from('matchups').select('*').eq('gameweek_id', gameweekId);
  for (const m of matchups || []) {
    const home = await teamGwScore(m.home_team_id, gameweekId);
    const away = await teamGwScore(m.away_team_id, gameweekId);
    const winner = home === away ? null : (home > away ? m.home_team_id : m.away_team_id);
    await supabase.from('matchups')
      .update({ home_score: home, away_score: away, winner_team_id: winner })
      .eq('id', m.id);
  }
}

export async function startLiveSim(leagueId, intervalMs = 2500) {
  if (liveTimer) return;
  await setFlag('live_sim_running', true);
  liveTimer = setInterval(() => fireRandomEvent(leagueId).catch(console.error), intervalMs);
}

export async function stopLiveSim() {
  if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
  await setFlag('live_sim_running', false);
}

export function isLiveSimRunning() { return !!liveTimer; }

export async function fireRandomEvent(leagueId, forcedType = null) {
  const gw = await getActiveGameweek(leagueId);
  if (!gw) return { ok: false, error: 'No active gameweek' };
  const { data: starters } = await supabase.from('lineups')
    .select('player_id').eq('gameweek_id', gw.id).eq('is_starter', true);
  if (!starters?.length) return { ok: false, error: 'No starters in active gameweek' };
  const player = starters[Math.floor(Math.random() * starters.length)].player_id;
  const pool = ['goal', 'assist', 'assist', 'save', 'save', 'save', 'yellow_card', 'minutes', 'minutes'];
  const type = forcedType || pool[Math.floor(Math.random() * pool.length)];
  return fireEvent(leagueId, player, type);
}

async function setFlag(key, value) {
  await supabase.from('sim_state')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}
