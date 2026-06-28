import { describe, it, expect } from 'vitest';
import {
  computePlayerScore,
  computeMatchupScore,
  getDefaultScoringSettings,
} from './scoring.js';

const D = getDefaultScoringSettings();

describe('computePlayerScore', () => {
  it('returns 0 for missing stats', () => {
    expect(computePlayerScore(null, D)).toBe(0);
    expect(computePlayerScore(undefined, D)).toBe(0);
  });

  it('falls back to default settings when none provided', () => {
    // 90 min midfielder, 1 goal: +2 (mins>=60) +5 (goal_mid)
    expect(computePlayerScore({ position: 'M', minutes: 90, goals: 1 })).toBe(7);
  });

  describe('minutes tiers', () => {
    it('awards 2 for >=60 minutes', () => {
      expect(computePlayerScore({ position: 'M', minutes: 60 }, D)).toBe(2);
      expect(computePlayerScore({ position: 'M', minutes: 90 }, D)).toBe(2);
    });
    it('awards 1 for 45-59 minutes', () => {
      expect(computePlayerScore({ position: 'M', minutes: 45 }, D)).toBe(1);
      expect(computePlayerScore({ position: 'M', minutes: 59 }, D)).toBe(1);
    });
    it('awards 0 for under 45 minutes', () => {
      expect(computePlayerScore({ position: 'M', minutes: 44 }, D)).toBe(0);
      expect(computePlayerScore({ position: 'M', minutes: 0 }, D)).toBe(0);
    });
  });

  describe('position-dependent goals', () => {
    const base = { minutes: 90, goals: 1 };
    it('goalkeeper goal = 10', () => {
      expect(computePlayerScore({ ...base, position: 'G' }, D)).toBe(12); // 2 + 10
    });
    it('defender goal = 7', () => {
      expect(computePlayerScore({ ...base, position: 'D' }, D)).toBe(9); // 2 + 7
    });
    it('midfielder goal = 5', () => {
      expect(computePlayerScore({ ...base, position: 'M' }, D)).toBe(7); // 2 + 5
    });
    it('forward goal = 4', () => {
      expect(computePlayerScore({ ...base, position: 'F' }, D)).toBe(6); // 2 + 4
    });
  });

  it('scores assists', () => {
    expect(computePlayerScore({ position: 'M', minutes: 90, assists: 2 }, D)).toBe(8); // 2 + 6
  });

  describe('clean sheets (position-dependent, only G/D/M)', () => {
    it('goalkeeper clean sheet = 6', () => {
      expect(computePlayerScore({ position: 'G', minutes: 90, clean_sheet: true }, D)).toBe(8);
    });
    it('defender clean sheet = 4', () => {
      expect(computePlayerScore({ position: 'D', minutes: 90, clean_sheet: true }, D)).toBe(6);
    });
    it('midfielder clean sheet = 1', () => {
      expect(computePlayerScore({ position: 'M', minutes: 90, clean_sheet: true }, D)).toBe(3);
    });
    it('forward clean sheet earns nothing extra', () => {
      expect(computePlayerScore({ position: 'F', minutes: 90, clean_sheet: true }, D)).toBe(2);
    });
  });

  it('awards saves only for goalkeepers, per 3 (floored)', () => {
    expect(computePlayerScore({ position: 'G', minutes: 90, saves: 6 }, D)).toBe(4); // 2 + 2
    expect(computePlayerScore({ position: 'G', minutes: 90, saves: 5 }, D)).toBe(3); // 2 + floor(5/3)=1
    // saves on an outfielder are ignored
    expect(computePlayerScore({ position: 'M', minutes: 90, saves: 6 }, D)).toBe(2);
  });

  it('applies penalty save and miss', () => {
    expect(computePlayerScore({ position: 'G', minutes: 90, penalty_saved: 1 }, D)).toBe(7); // 2 + 5
    expect(computePlayerScore({ position: 'F', minutes: 90, goals: 2, penalty_missed: 1 }, D))
      .toBe(8); // 2 + 8 - 2
  });

  describe('negative events clamp the total at 0', () => {
    it('a lone yellow card cannot push below zero', () => {
      expect(computePlayerScore({ position: 'M', minutes: 30, yellow_cards: 1 }, D)).toBe(0);
    });
    it('a red card on a sub cannot push below zero', () => {
      expect(computePlayerScore({ position: 'F', minutes: 90, red_cards: 1 }, D)).toBe(0); // 2 - 3 -> clamp
    });
    it('own goals subtract', () => {
      expect(computePlayerScore({ position: 'D', minutes: 90, clean_sheet: true, own_goals: 1 }, D))
        .toBe(4); // 2 + 4 - 2
    });
  });

  it('adds manual bonus points', () => {
    expect(computePlayerScore({ position: 'F', minutes: 90, goals: 1, bonus_pts: 3 }, D)).toBe(9); // 2 + 4 + 3
  });

  it('respects custom scoring settings', () => {
    const custom = { ...D, goal_fwd: 10, minutes_played_60: 0 };
    expect(computePlayerScore({ position: 'F', minutes: 90, goals: 1 }, custom)).toBe(10);
  });

  it('rounds fractional results', () => {
    const custom = { ...D, save_per_3: 0.5, minutes_played_60: 0 };
    // floor(9/3)=3 saves * 0.5 = 1.5 -> rounds to 2
    expect(computePlayerScore({ position: 'G', minutes: 90, saves: 9 }, custom)).toBe(2);
  });
});

describe('computeMatchupScore', () => {
  it('returns 0 for non-array input', () => {
    expect(computeMatchupScore(null, D)).toBe(0);
    expect(computeMatchupScore(undefined, D)).toBe(0);
  });

  it('sums only starters that have stats', () => {
    const lineup = [
      { is_starter: true, player_stats: { position: 'M', minutes: 90, goals: 1 } },  // 7
      { is_starter: true, player_stats: { position: 'F', minutes: 90, goals: 1 } },  // 6
      { is_starter: false, player_stats: { position: 'F', minutes: 90, goals: 5 } }, // bench, ignored
      { is_starter: true, player_stats: null },                                      // no stats, ignored
    ];
    expect(computeMatchupScore(lineup, D)).toBe(13);
  });

  it('returns 0 for an empty lineup', () => {
    expect(computeMatchupScore([], D)).toBe(0);
  });
});

describe('getDefaultScoringSettings', () => {
  it('exposes the full FPL-style settings surface', () => {
    const s = getDefaultScoringSettings();
    expect(s).toMatchObject({
      goal_gk: 10, goal_def: 7, goal_mid: 5, goal_fwd: 4,
      assist: 3, clean_sheet_gk: 6, clean_sheet_def: 4, clean_sheet_mid: 1,
      save_per_3: 1, yellow_card: -1, red_card: -3, own_goal: -2,
      penalty_miss: -2, penalty_save: 5,
      minutes_played_60: 2, minutes_played_45: 1, bonus: 1,
    });
  });

  it('returns a fresh object each call (no shared mutation)', () => {
    const a = getDefaultScoringSettings();
    a.goal_fwd = 99;
    expect(getDefaultScoringSettings().goal_fwd).toBe(4);
  });
});
