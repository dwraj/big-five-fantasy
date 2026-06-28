import express from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';

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

    // Get current draft session
    const { data: draft, error: draftError } = await supabase
      .from('draft_sessions')
      .select('*')
      .eq('league_id', leagueId)
      .single();

    if (draftError || !draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    // Verify team is eligible to pick (check draft_order and current_pick)
    const { data: draftOrder } = await supabase
      .from('draft_order')
      .select('*')
      .eq('draft_id', draft.id)
      .order('slot', { ascending: true });

    if (!draftOrder || draftOrder.length === 0) {
      return res.status(400).json({ error: 'No draft order found' });
    }

    // Calculate whose turn it is (snake ordering)
    const numTeams = draftOrder.length;
    const pickNumber = draft.current_pick;
    const round = draft.current_round;

    // Snake logic: odd rounds go 1->N, even rounds go N->1
    let slot;
    if (round % 2 === 1) {
      // Odd round: forward order
      slot = ((pickNumber - 1) % numTeams) + 1;
    } else {
      // Even round: reverse order
      slot = numTeams - ((pickNumber - 1) % numTeams);
    }

    const expectedTeam = draftOrder.find(o => o.slot === slot)?.team_id;
    if (expectedTeam !== teamId) {
      return res.status(403).json({ error: 'Not your turn' });
    }

    // Check player not already drafted
    const { data: existingPick } = await supabase
      .from('draft_picks')
      .select('id')
      .eq('draft_id', draft.id)
      .eq('player_id', playerId)
      .single();

    if (existingPick) {
      return res.status(400).json({ error: 'Player already drafted' });
    }

    // Record the pick
    const { data: pick, error: pickError } = await supabase
      .from('draft_picks')
      .insert({
        draft_id: draft.id,
        team_id: teamId,
        player_id: playerId,
        round,
        pick_number: pickNumber,
        is_auto: false,
        picked_at: new Date().toISOString()
      })
      .select()
      .single();

    if (pickError) {
      return res.status(400).json({ error: pickError.message });
    }

    // Add to roster
    const { error: rosterError } = await supabase
      .from('rosters')
      .insert({
        team_id: teamId,
        player_id: playerId,
        acquisition_type: 'draft'
      });

    if (rosterError && !rosterError.message.includes('duplicate')) {
      console.error('Roster insert error:', rosterError);
    }

    // Advance to next pick
    let nextPick = draft.current_pick + 1;
    let nextRound = draft.current_round;
    if (nextPick > numTeams * draft.current_round) {
      nextRound++;
      nextPick = numTeams * (nextRound - 1) + 1;
    }

    await supabase
      .from('draft_sessions')
      .update({ current_pick: nextPick, current_round: nextRound })
      .eq('id', draft.id);

    res.json({ pick, nextPick, nextRound });
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
