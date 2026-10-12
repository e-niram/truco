import { describe, it, expect } from 'vitest';
import { isTenHand, isIronHand, startingPointsAtStake } from '../matchRules.ts';

describe('isTenHand', () => {
  it('is false when neither player has reached 10', () => {
    expect(isTenHand({ player1: 8, player2: 6 })).toBe(false);
  });

  it('is true when either player has reached 10', () => {
    expect(isTenHand({ player1: 10, player2: 0 })).toBe(true);
    expect(isTenHand({ player1: 0, player2: 10 })).toBe(true);
  });
});

describe('isIronHand', () => {
  it('is false unless both players have reached 10', () => {
    expect(isIronHand({ player1: 10, player2: 8 })).toBe(false);
  });

  it('is true when both players have reached 10', () => {
    expect(isIronHand({ player1: 10, player2: 10 })).toBe(true);
  });
});

describe('startingPointsAtStake', () => {
  it('is 2 for a normal hand', () => {
    expect(startingPointsAtStake({ player1: 4, player2: 6 })).toBe(2);
  });

  it('is 4 once either player has reached 10', () => {
    expect(startingPointsAtStake({ player1: 10, player2: 2 })).toBe(4);
    expect(startingPointsAtStake({ player1: 10, player2: 10 })).toBe(4);
  });
});
