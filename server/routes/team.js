import express from 'express';

const router = express.Router();

// GET /api/teams/:teamId
router.get('/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { data, error } = await req.supabase
      .from('teams')
      .select('*, users(name, email), rosters(*)')
      .eq('id', teamId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/teams/:teamId/roster
router.get('/:teamId/roster', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { data, error } = await req.supabase
      .from('rosters')
      .select('*, players(*)')
      .eq('team_id', teamId);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/teams/:teamId/lineups/:gameweekId
router.get('/:teamId/lineups/:gameweekId', async (req, res) => {
  try {
    const { teamId, gameweekId } = req.params;
    const { data, error } = await req.supabase
      .from('lineups')
      .select('*, players(*)')
      .eq('team_id', teamId)
      .eq('gameweek_id', gameweekId);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
