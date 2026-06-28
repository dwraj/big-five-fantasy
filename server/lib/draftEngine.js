import { getSupabaseAdmin } from './supabase.js';

const supabase = getSupabaseAdmin();

export const DRAFT_ROUNDS = 15;

export function slotForPick(round, pickNumber, numTeams) {
  return round % 2 === 1
    ? ((pickNumber - 1) % numTeams) + 1
    : numTeams - ((pickNumber - 1) % numTeams);
}

export function nextPointer(currentPick, currentRound, numTeams) {
  let nextPick = currentPick + 1;
  let nextRound = currentRound;
  if (nextPick > numTeams * currentRound) {
    nextRound += 1;
    nextPick = numTeams * (nextRound - 1) + 1;
  }
  return { nextPick, nextRound };
}

export async function getDraftContext(leagueId) {
  const { data: draft } = await supabase
    .from('draft_sessions').select('*').eq('league_id', leagueId).single();
  if (!draft) return null;
  const { data: order } = await supabase
    .from('draft_order').select('*').eq('draft_id', draft.id)
    .order('slot', { ascending: true });
  const numTeams = order?.length || 0;
  const slot = numTeams ? slotForPick(draft.current_round, draft.current_pick, numTeams) : null;
  const onClockTeamId = order?.find(o => o.slot === slot)?.team_id || null;
  const complete = draft.current_round > DRAFT_ROUNDS || draft.status === 'complete';
  return { draft, order, numTeams, onClockTeamId, complete };
}

export async function recordPick(leagueId, teamId, playerId, isAuto = false) {
  const ctx = await getDraftContext(leagueId);
  if (!ctx) return { ok: false, error: 'Draft not found' };
  if (ctx.complete) return { ok: false, error: 'Draft complete' };
  if (ctx.onClockTeamId !== teamId) return { ok: false, error: 'Not your turn' };

  const { data: dupe } = await supabase
    .from('draft_picks').select('id').eq('draft_id', ctx.draft.id)
    .eq('player_id', playerId).maybeSingle();
  if (dupe) return { ok: false, error: 'Player already drafted' };

  const { data: pick, error: pickErr } = await supabase.from('draft_picks').insert({
    draft_id: ctx.draft.id, team_id: teamId, player_id: playerId,
    round: ctx.draft.current_round, pick_number: ctx.draft.current_pick,
    is_auto: isAuto, picked_at: new Date().toISOString(),
  }).select().single();
  if (pickErr) return { ok: false, error: pickErr.message };

  const { error: rErr } = await supabase.from('rosters')
    .insert({ team_id: teamId, player_id: playerId, acquisition_type: 'draft' });
  if (rErr && !rErr.message.includes('duplicate')) console.error('roster insert:', rErr);

  const { nextPick, nextRound } =
    nextPointer(ctx.draft.current_pick, ctx.draft.current_round, ctx.numTeams);
  await supabase.from('draft_sessions')
    .update({ current_pick: nextPick, current_round: nextRound })
    .eq('id', ctx.draft.id);

  return { ok: true, pick, nextPick, nextRound };
}

export async function pickBestAvailable(leagueId, teamId) {
  const ctx = await getDraftContext(leagueId);
  const { data: picks } = await supabase
    .from('draft_picks').select('player_id').eq('draft_id', ctx.draft.id);
  const taken = new Set((picks || []).map(p => p.player_id));

  const { data: roster } = await supabase
    .from('rosters').select('player_id, players(position)').eq('team_id', teamId);
  const counts = { G: 0, D: 0, M: 0, F: 0 };
  (roster || []).forEach(r => { const p = r.players?.position; if (p) counts[p] += 1; });

  const targets = { G: 2, D: 5, M: 5, F: 3 };
  const needOrder = Object.keys(targets)
    .sort((a, b) => (targets[b] - counts[b]) - (targets[a] - counts[a]));

  const { data: players } = await supabase
    .from('players').select('id, position, season_points')
    .eq('status', 'active').order('season_points', { ascending: false }).limit(500);
  const available = (players || []).filter(p => !taken.has(p.id));

  for (const pos of needOrder) {
    const hit = available.find(p => p.position === pos);
    if (hit) return hit.id;
  }
  return available[0]?.id || null;
}

export async function autoDraftUntilHuman(leagueId, humanTeamId, maxPicks = 300) {
  const log = [];
  for (let n = 0; n < maxPicks; n++) {
    const ctx = await getDraftContext(leagueId);
    if (!ctx || ctx.complete || !ctx.onClockTeamId) break;
    if (ctx.onClockTeamId === humanTeamId) break;
    const playerId = await pickBestAvailable(leagueId, ctx.onClockTeamId);
    if (!playerId) break;
    const res = await recordPick(leagueId, ctx.onClockTeamId, playerId, true);
    if (!res.ok) break;
    log.push({ teamId: ctx.onClockTeamId, playerId });
  }
  return log;
}
