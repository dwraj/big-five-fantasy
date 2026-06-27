import express from 'express';

const router = express.Router();

// GET /api/matchups/:teamId/current
router.get('/:teamId/current', async (req, res) => {
  try {
    const { teamId } = req.params;

    // Get current gameweek
    const { data: currentGW, error: gwError } = await req.supabase
      .from('gameweeks')
      .select('*')
      .eq('status', 'active')
      .limit(1);

    if (gwError) throw gwError;
    if (!currentGW?.[0]) return res.json(null);

    const gameweekId = currentGW[0].id;

    // Get matchup for this team and gameweek
    const { data: matchup, error: matchError } = await req.supabase
      .from('matchups')
      .select('*, home_team:teams(id, name, logo_url), away_team:teams(id, name, logo_url)')
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .eq('gameweek_id', gameweekId)
      .single();

    if (matchError && matchError.code !== 'PGRST116') throw matchError;
    res.json(matchup || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/matchups/:matchupId/lineups
router.get('/:matchupId/lineups', async (req, res) => {
  try {
    const { matchupId } = req.params;

    const { data: matchup, error: matchError } = await req.supabase
      .from('matchups')
      .select('*')
      .eq('id', matchupId)
      .single();

    if (matchError) throw matchError;

    const [homeLineup, awayLineup] = await Promise.all([
      req.supabase
        .from('lineups')
        .select('*, players(*)')
        .eq('team_id', matchup.home_team_id)
        .eq('gameweek_id', matchup.gameweek_id),
      req.supabase
        .from('lineups')
        .select('*, players(*)')
        .eq('team_id', matchup.away_team_id)
        .eq('gameweek_id', matchup.gameweek_id)
    ]);

    res.json({
      matchupId,
      homeLineup: homeLineup.data || [],
      awayLineup: awayLineup.data || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
