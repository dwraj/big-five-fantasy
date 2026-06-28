import { describe, it, expect } from 'vitest';
import { slotForPick, nextPointer, DRAFT_ROUNDS } from './draftEngine.js';

describe('DRAFT_ROUNDS', () => {
  it('is 15', () => {
    expect(DRAFT_ROUNDS).toBe(15);
  });
});

describe('slotForPick (snake order)', () => {
  it('odd rounds run low->high', () => {
    expect(slotForPick(1, 1, 8)).toBe(1);
    expect(slotForPick(1, 4, 8)).toBe(4);
    expect(slotForPick(1, 8, 8)).toBe(8);
  });

  it('even rounds reverse high->low', () => {
    // round 2, global picks 9..16 with 8 teams
    expect(slotForPick(2, 9, 8)).toBe(8);
    expect(slotForPick(2, 12, 8)).toBe(5);
    expect(slotForPick(2, 16, 8)).toBe(1);
  });

  it('odd rounds after the first resume low->high', () => {
    expect(slotForPick(3, 17, 8)).toBe(1);
    expect(slotForPick(3, 24, 8)).toBe(8);
  });

  it('produces a full snake pattern for 4 teams over 3 rounds', () => {
    const numTeams = 4;
    const seen = [];
    let pick = 1;
    let round = 1;
    for (let i = 0; i < numTeams * 3; i++) {
      seen.push(slotForPick(round, pick, numTeams));
      ({ nextPick: pick, nextRound: round } = nextPointer(pick, round, numTeams));
    }
    expect(seen).toEqual([
      1, 2, 3, 4, // round 1
      4, 3, 2, 1, // round 2 (snake)
      1, 2, 3, 4, // round 3
    ]);
  });
});

describe('nextPointer', () => {
  it('advances the pick within a round', () => {
    expect(nextPointer(1, 1, 8)).toEqual({ nextPick: 2, nextRound: 1 });
    expect(nextPointer(7, 1, 8)).toEqual({ nextPick: 8, nextRound: 1 });
  });

  it('rolls into the next round at the round boundary', () => {
    // last pick of round 1 (8 teams) is global pick 8
    expect(nextPointer(8, 1, 8)).toEqual({ nextPick: 9, nextRound: 2 });
    // last pick of round 2 is global pick 16
    expect(nextPointer(16, 2, 8)).toEqual({ nextPick: 17, nextRound: 3 });
  });

  it('keeps global pick numbers contiguous across a full draft', () => {
    const numTeams = 8;
    let pick = 1;
    let round = 1;
    const picks = [pick];
    for (let i = 1; i < numTeams * DRAFT_ROUNDS; i++) {
      ({ nextPick: pick, nextRound: round } = nextPointer(pick, round, numTeams));
      picks.push(pick);
    }
    // global pick numbers should be 1..(numTeams*DRAFT_ROUNDS) with no gaps
    expect(picks).toEqual(
      Array.from({ length: numTeams * DRAFT_ROUNDS }, (_, i) => i + 1),
    );
    expect(round).toBe(DRAFT_ROUNDS);
  });
});
