import express from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';
import * as draftEngine from '../lib/draftEngine.js';
import * as sim from '../lib/simEngine.js';
import { processWaiversForLeague } from '../scripts/processWaivers.js';
import { finalizeGameweek } from '../scripts/syncPlayerStats.js';

const router = express.Router();
const supabase = getSupabaseAdmin();

const LEAGUE = '11111111-1111-1111-1111-111111111111';
const HUMAN_TEAM_USER = '00000000-0000-0000-0000-000000000001';

router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  next();
});

async function getPhase() {
  const { data } = await supabase.from('sim_state').select('value').eq('key', 'current_phase').maybeSingle();
  return data?.value || 'PRE_SEASON';
}

async function setPhase(phase) {
  await supabase.from('sim_state')
    .upsert({ key: 'current_phase', value: phase, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}

async function humanTeamId() {
  const { data } = await supabase.from('teams').select('id')
    .eq('league_id', LEAGUE).eq('user_id', HUMAN_TEAM_USER).maybeSingle();
  return data?.id || null;
}

// GET /api/dev/state
router.get('/state', async (req, res) => {
  try {
    const phase = await getPhase();
    const { data: gw } = await supabase.from('gameweeks').select('*')
      .eq('league_id', LEAGUE).eq('status', 'active').order('number').limit(1);
    const draftCtx = await draftEngine.getDraftContext(LEAGUE);
    const me = await humanTeamId();
    const { data: teams } = await supabase.from('teams')
      .select('id, name').eq('league_id', LEAGUE);
    res.json({
      phase,
      leagueId: LEAGUE,
      humanTeamId: me,
      teams: teams || [],
      liveSimRunning: sim.isLiveSimRunning(),
      activeGameweek: gw?.[0] || null,
      draft: draftCtx ? {
        status: draftCtx.draft.status,
        round: draftCtx.draft.current_round,
        pick: draftCtx.draft.current_pick,
        onClockTeamId: draftCtx.onClockTeamId,
        isMyTurn: draftCtx.onClockTeamId === me,
        complete: draftCtx.complete,
      } : null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/dev/phase { phase }
router.post('/phase', async (req, res) => {
  try {
    const { phase } = req.body;
    const setups = {
      PRE_SEASON:  setupPreSeason,
      DRAFTING:    setupDrafting,
      LIVE_ACTION: setupLiveAction,
      MID_WEEK:    setupMidWeek,
      POST_SEASON: setupPostSeason,
    };
    if (!setups[phase]) return res.status(400).json({ error: 'Unknown phase' });
    await setups[phase]();
    await setPhase(phase);
    res.json({ ok: true, phase });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/dev/draft/init
router.post('/draft/init', async (req, res) => {
  try { await initDraft(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/dev/draft/pick { playerId }
router.post('/draft/pick', async (req, res) => {
  try {
    const { playerId } = req.body;
    const me = await humanTeamId();
    const human = await draftEngine.recordPick(LEAGUE, me, playerId, false);
    if (!human.ok) return res.status(400).json({ error: human.error });
    const botLog = await draftEngine.autoDraftUntilHuman(LEAGUE, me);
    const ctx = await draftEngine.getDraftContext(LEAGUE);
    if (ctx?.complete) {
      await supabase.from('draft_sessions')
        .update({ status: 'complete', completed_at: new Date().toISOString() })
        .eq('league_id', LEAGUE);
    }
    res.json({ ok: true, yourPick: human.pick, botPicks: botLog, complete: ctx?.complete });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dev/live-state
router.get('/live-state', async (req, res) => {
  try {
    const gw = await sim.getActiveGameweek(LEAGUE);
    if (!gw) return res.json({ matchups: [], gameweek: null });
    const { data: matchups } = await supabase.from('matchups')
      .select('id, home_team_id, away_team_id, home_score, away_score, status')
      .eq('gameweek_id', gw.id);
    const { data: teams } = await supabase.from('teams')
      .select('id, name, total_points').eq('league_id', LEAGUE);
    res.json({ gameweek: gw, matchups: matchups || [], teams: teams || [], liveSimRunning: sim.isLiveSimRunning() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/dev/live/event { playerId, type }
router.post('/live/event', async (req, res) => {
  try {
    const { playerId, type } = req.body;
    const r = await sim.fireEvent(LEAGUE, playerId, type);
    res.status(r.ok ? 200 : 400).json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/dev/live/fire-random { type? } — fires an event for a random starter
router.post('/live/fire-random', async (req, res) => {
  try {
    const { type } = req.body || {};
    const r = await sim.fireRandomEvent(LEAGUE, type || null);
    res.status(r.ok ? 200 : 400).json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/dev/live/start
router.post('/live/start', async (req, res) => {
  try { await sim.startLiveSim(LEAGUE); res.json({ ok: true, running: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/dev/live/stop
router.post('/live/stop', async (req, res) => {
  try { await sim.stopLiveSim(); res.json({ ok: true, running: false }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/dev/advance
router.post('/advance', async (req, res) => {
  try {
    await sim.stopLiveSim();
    const gw = await sim.getActiveGameweek(LEAGUE);
    if (!gw) return res.status(400).json({ error: 'No active gameweek' });

    await supabase.from('fixtures').update({ status: 'FT' }).eq('id', 99000 + gw.number);
    await finalizeGameweek(LEAGUE, gw.id);
    await sim.recomputeMatchupScores(gw.id);
    await supabase.from('matchups').update({ status: 'complete' }).eq('gameweek_id', gw.id);
    await supabase.from('gameweeks').update({ status: 'complete' }).eq('id', gw.id);
    await applyMatchupResults(gw.id);
    await processWaiversForLeague(LEAGUE, gw.id);

    const { data: next } = await supabase.from('gameweeks').select('*')
      .eq('league_id', LEAGUE).eq('number', gw.number + 1).maybeSingle();
    if (next) await supabase.from('gameweeks').update({ status: 'active' }).eq('id', next.id);
    await setPhase('MID_WEEK');
    res.json({ ok: true, finalized: gw.number, nextGameweek: next?.number || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Phase setup helpers ───────────────────────────────────────────────────────

async function setupPreSeason() {
  await sim.stopLiveSim();
  await supabase.from('draft_sessions').delete().eq('league_id', LEAGUE);
  await clearGameplayState();
  await setGameweekActive(1);
}

async function setupDrafting() {
  await sim.stopLiveSim();
  await clearGameplayState();
  await initDraft();
  await supabase.from('draft_sessions')
    .update({ status: 'active', started_at: new Date().toISOString() })
    .eq('league_id', LEAGUE);
  await setGameweekActive(1);
  // Auto-advance bots up to the human's first pick so the draft isn't stuck
  // when the human doesn't hold slot 1 (draft order is shuffled).
  const me = await humanTeamId();
  await draftEngine.autoDraftUntilHuman(LEAGUE, me);
}

async function setupLiveAction() {
  await ensureRostersExist();
  const gw = (await sim.getActiveGameweek(LEAGUE)) || (await setGameweekActive(1));
  await sim.generateLineups(LEAGUE, gw);
  await sim.initLiveStats(LEAGUE, gw);
  await supabase.from('matchups').update({ status: 'active' }).eq('gameweek_id', gw.id);
}

async function setupMidWeek() {
  await setupLiveAction();
}

async function setupPostSeason() {
  await sim.stopLiveSim();
  await supabase.from('gameweeks').update({ status: 'complete' }).eq('league_id', LEAGUE);
  const { data: gws } = await supabase.from('gameweeks').select('id').eq('league_id', LEAGUE);
  const gwIds = (gws || []).map(g => g.id);
  if (gwIds.length) {
    await supabase.from('matchups').update({ status: 'complete' }).in('gameweek_id', gwIds);
  }
}

// ── Small helpers ─────────────────────────────────────────────────────────────

async function initDraft() {
  await supabase.from('draft_sessions').delete().eq('league_id', LEAGUE);
  const { data: teams } = await supabase.from('teams').select('id').eq('league_id', LEAGUE);
  const { data: draft } = await supabase.from('draft_sessions')
    .insert({ league_id: LEAGUE, status: 'pending', current_round: 1, current_pick: 1 })
    .select().single();
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  await supabase.from('draft_order').insert(
    shuffled.map((t, i) => ({ draft_id: draft.id, team_id: t.id, slot: i + 1 }))
  );
}

async function ensureRostersExist() {
  const { count } = await supabase.from('rosters').select('*', { count: 'exact', head: true });
  if (count && count > 0) return;
  await initDraft();
  await supabase.from('draft_sessions')
    .update({ status: 'active', started_at: new Date().toISOString() }).eq('league_id', LEAGUE);
  for (let i = 0; i < 1000; i++) {
    const ctx = await draftEngine.getDraftContext(LEAGUE);
    if (!ctx || ctx.complete || !ctx.onClockTeamId) break;
    const pid = await draftEngine.pickBestAvailable(LEAGUE, ctx.onClockTeamId);
    if (!pid) break;
    await draftEngine.recordPick(LEAGUE, ctx.onClockTeamId, pid, true);
  }
  await supabase.from('draft_sessions')
    .update({ status: 'complete', completed_at: new Date().toISOString() }).eq('league_id', LEAGUE);
}

async function clearGameplayState() {
  const { data: teams } = await supabase.from('teams').select('id').eq('league_id', LEAGUE);
  const teamIds = (teams || []).map(t => t.id);
  if (teamIds.length) {
    await supabase.from('rosters').delete().in('team_id', teamIds);
    await supabase.from('lineups').delete().in('team_id', teamIds);
    await supabase.from('matchups')
      .update({ home_score: 0, away_score: 0, status: 'upcoming', winner_team_id: null })
      .in('home_team_id', teamIds);
  }
  await supabase.from('teams')
    .update({ wins: 0, losses: 0, total_points: 0, gameweek_points: 0 })
    .eq('league_id', LEAGUE);
}

async function setGameweekActive(number) {
  await supabase.from('gameweeks').update({ status: 'upcoming' }).eq('league_id', LEAGUE);
  const { data } = await supabase.from('gameweeks')
    .update({ status: 'active' }).eq('league_id', LEAGUE).eq('number', number).select().single();
  return data;
}

async function applyMatchupResults(gameweekId) {
  const { data: ms } = await supabase.from('matchups').select('*').eq('gameweek_id', gameweekId);
  for (const m of ms || []) {
    if (m.winner_team_id) {
      const loser = m.winner_team_id === m.home_team_id ? m.away_team_id : m.home_team_id;
      await bumpTeam(m.winner_team_id, { win: true, points: Math.max(m.home_score, m.away_score) });
      await bumpTeam(loser, { win: false, points: Math.min(m.home_score, m.away_score) });
    } else {
      await bumpTeam(m.home_team_id, { points: m.home_score });
      await bumpTeam(m.away_team_id, { points: m.away_score });
    }
  }
}

async function bumpTeam(teamId, { win, points = 0 }) {
  const { data: t } = await supabase.from('teams').select('wins, losses, total_points').eq('id', teamId).single();
  await supabase.from('teams').update({
    wins: (t.wins || 0) + (win === true ? 1 : 0),
    losses: (t.losses || 0) + (win === false ? 1 : 0),
    total_points: (t.total_points || 0) + points,
  }).eq('id', teamId);
}

export default router;
