// Compute fantasy points for a player's stat line based on league scoring settings
export function computePlayerScore(stats, scoringSettings) {
  if (!stats) return 0;

  const {
    goal_gk = 10,
    goal_def = 7,
    goal_mid = 5,
    goal_fwd = 4,
    assist = 3,
    clean_sheet_gk = 6,
    clean_sheet_def = 4,
    clean_sheet_mid = 1,
    save_per_3 = 1,
    yellow_card = -1,
    red_card = -3,
    own_goal = -2,
    penalty_miss = -2,
    penalty_save = 5,
    minutes_played_60 = 2,
    minutes_played_45 = 1,
    bonus = 1
  } = scoringSettings || {};

  let score = 0;

  // Minutes played bonus (tiered)
  if (stats.minutes >= 60) {
    score += minutes_played_60;
  } else if (stats.minutes >= 45) {
    score += minutes_played_45;
  }

  // Goals (position-dependent)
  const goals = stats.goals || 0;
  if (stats.position === 'G') {
    score += goals * goal_gk;
  } else if (stats.position === 'D') {
    score += goals * goal_def;
  } else if (stats.position === 'M') {
    score += goals * goal_mid;
  } else if (stats.position === 'F') {
    score += goals * goal_fwd;
  }

  // Assists
  score += (stats.assists || 0) * assist;

  // Clean sheets (position-dependent)
  if (stats.clean_sheet) {
    if (stats.position === 'G') {
      score += clean_sheet_gk;
    } else if (stats.position === 'D') {
      score += clean_sheet_def;
    } else if (stats.position === 'M') {
      score += clean_sheet_mid;
    }
  }

  // Saves (only for goalkeepers)
  if (stats.position === 'G' && stats.saves) {
    score += Math.floor(stats.saves / 3) * save_per_3;
  }

  // Penalties
  score += (stats.penalty_saved || 0) * penalty_save;
  score += (stats.penalty_missed || 0) * penalty_miss;

  // Cards
  score += (stats.yellow_cards || 0) * yellow_card;
  score += (stats.red_cards || 0) * red_card;

  // Own goals
  score += (stats.own_goals || 0) * own_goal;

  // Bonus points (manually assigned, usually from official sources)
  score += (stats.bonus_pts || 0) * bonus;

  return Math.max(0, Math.round(score));
}

// Compute total team score for a gameweek from all starting players
export function computeMatchupScore(lineupPlayers, scoringSettings) {
  if (!Array.isArray(lineupPlayers)) return 0;

  return lineupPlayers.reduce((total, player) => {
    if (player.is_starter && player.player_stats) {
      return total + computePlayerScore(player.player_stats, scoringSettings);
    }
    return total;
  }, 0);
}

// Get default scoring settings (FPL-style)
export function getDefaultScoringSettings() {
  return {
    goal_gk: 10,
    goal_def: 7,
    goal_mid: 5,
    goal_fwd: 4,
    assist: 3,
    clean_sheet_gk: 6,
    clean_sheet_def: 4,
    clean_sheet_mid: 1,
    save_per_3: 1,
    yellow_card: -1,
    red_card: -3,
    own_goal: -2,
    penalty_miss: -2,
    penalty_save: 5,
    minutes_played_60: 2,
    minutes_played_45: 1,
    bonus: 1
  };
}
