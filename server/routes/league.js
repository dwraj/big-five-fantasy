import express from 'express';

const router = express.Router();

// GET /api/leagues/:leagueId
router.get('/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { data, error } = await req.supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leagues/:leagueId/standings
router.get('/:leagueId/standings', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { data, error } = await req.supabase
      .from('teams')
      .select('*')
      .eq('league_id', leagueId)
      .order('total_points', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leagues/:leagueId/overview
router.get('/:leagueId/overview', async (req, res) => {
  try {
    const { leagueId } = req.params;

    const [league, teams, currentGW] = await Promise.all([
      req.supabase.from('leagues').select('*').eq('id', leagueId).single(),
      req.supabase.from('teams').select('*').eq('league_id', leagueId),
      req.supabase.from('gameweeks').select('*').eq('league_id', leagueId).eq('status', 'active').single()
    ]);

    res.json({
      league: league.data,
      teamCount: teams.data?.length || 0,
      currentGameweek: currentGW.data?.number,
      status: league.data?.draft_status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
