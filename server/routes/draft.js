import express from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';
import * as draftEngine from '../lib/draftEngine.js';

const router = express.Router();
const supabase = getSupabaseAdmin();

// GET /api/drafts/:leagueId - Get draft session for league
router.get('/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;

    const { data: draft, error } = await supabase
      .from('draft_sessions')
      .select(`
        *,
        draft_picks(
          id,
          team_id,
          player_id,
          round,
          pick_number,
          is_auto,
          picked_at
        ),
        draft_order(
          id,
          team_id,
          slot
        )
      `)
      .eq('league_id', leagueId)
      .single();

    if (error || !draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json(draft);
  } catch (error) {
    console.error('Error fetching draft:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/drafts/:leagueId/init - Initialize draft for league
router.post('/:leagueId/init', async (req, res) => {
  try {
    const { leagueId } = req.params;

    // Get all teams in league
    const { data: teams, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId);

    if (teamError || !teams || teams.length === 0) {
      return res.status(400).json({ error: 'No teams in league' });
    }

    // Create draft session
    const { data: draft, error: draftError } = await supabase
      .from('draft_sessions')
      .insert({
        league_id: leagueId,
        status: 'pending',
        current_round: 1,
        current_pick: 1
      })
      .select()
      .single();

    if (draftError || !draft) {
      return res.status(400).json({ error: draftError?.message || 'Failed to create draft' });
    }

    // Generate random draft order (will be snaked in picks)
    const shuffledTeams = teams.sort(() => Math.random() - 0.5);
    const draftOrderRecords = shuffledTeams.map((team, idx) => ({
      draft_id: draft.id,
      team_id: team.id,
      slot: idx + 1
    }));

    const { error: orderError } = await supabase
      .from('draft_order')
      .insert(draftOrderRecords);

    if (orderError) {
      return res.status(400).json({ error: orderError.message });
    }

    res.json({ draft, teamCount: teams.length });
  } catch (error) {
    console.error('Error initializing draft:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/drafts/:leagueId/start - Start the draft
router.post('/:leagueId/start', async (req, res) => {
  try {
    const { leagueId } = req.params;

    const { data: draft, error } = await supabase
      .from('draft_sessions')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('league_id', leagueId)
      .select()
      .single();

    if (error || !draft) {
      return res.status(400).json({ error: error?.message || 'Failed to start draft' });
    }

    res.json(draft);
  } catch (error) {
    console.error('Error starting draft:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/drafts/:leagueId/pick - Submit a draft pick
router.post('/:leagueId/pick', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { teamId, playerId } = req.body;

    if (!teamId || !playerId) {
      return res.status(400).json({ error: 'teamId and playerId required' });
    }

    const result = await draftEngine.recordPick(leagueId, teamId, playerId, false);
    if (!result.ok) {
      const status = result.error === 'Not your turn' ? 403
        : result.error === 'Draft not found' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }

    res.json({ pick: result.pick, nextPick: result.nextPick, nextRound: result.nextRound });
  } catch (error) {
    console.error('Error recording pick:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/drafts/:leagueId/complete - Mark draft as complete
router.post('/:leagueId/complete', async (req, res) => {
  try {
    const { leagueId } = req.params;

    const { data: draft, error } = await supabase
      .from('draft_sessions')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('league_id', leagueId)
      .select()
      .single();

    if (error || !draft) {
      return res.status(400).json({ error: error?.message || 'Failed to complete draft' });
    }

    res.json(draft);
  } catch (error) {
    console.error('Error completing draft:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
