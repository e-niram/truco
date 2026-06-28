import { describe, it, expect } from 'vitest';
import { cardStrength, isManilha, resolveRound, resolveHand } from '../ranking.ts';
import type { Trick, Seat } from '../types.ts';

function makeTrick(
  p1: { rank: string; suit: string; strength: number } | null,
  p2: { rank: string; suit: string; strength: number } | null,
  winner: Seat | 'tie' | null,
  round: 1 | 2 | 3 = 1,
): Trick {
  return {
    roundNumber: round,
    player1Card: p1
      ? { rank: p1.rank as never, suit: p1.suit as never, id: `${p1.rank}-${p1.suit}`, isManilha: false, strength: p1.strength }
      : null,
    player2Card: p2
      ? { rank: p2.rank as never, suit: p2.suit as never, id: `${p2.rank}-${p2.suit}`, isManilha: false, strength: p2.strength }
      : null,
    winner,
  };
}

describe('isManilha', () => {
  it('identifies all four manilhas', () => {
    expect(isManilha('4', 'clubs')).toBe(true);
    expect(isManilha('7', 'hearts')).toBe(true);
    expect(isManilha('A', 'spades')).toBe(true);
    expect(isManilha('7', 'diamonds')).toBe(true);
  });

  it('does not flag non-manilha cards', () => {
    expect(isManilha('4', 'hearts')).toBe(false);
    expect(isManilha('7', 'clubs')).toBe(false);
    expect(isManilha('A', 'hearts')).toBe(false);
    expect(isManilha('3', 'clubs')).toBe(false);
  });
});

describe('cardStrength', () => {
  it('orders manilhas correctly (4♣ strongest)', () => {
    const zap = cardStrength('4', 'clubs');
    const copeta = cardStrength('7', 'hearts');
    const espadilha = cardStrength('A', 'spades');
    const picafumo = cardStrength('7', 'diamonds');

    expect(zap).toBeGreaterThan(copeta);
    expect(copeta).toBeGreaterThan(espadilha);
    expect(espadilha).toBeGreaterThan(picafumo);
  });

  it('manilhas are stronger than all normal cards', () => {
    const weakestManilha = cardStrength('7', 'diamonds');
    const strongestNormal = cardStrength('3', 'clubs');
    expect(weakestManilha).toBeGreaterThan(strongestNormal);
  });

  it('orders normal cards correctly', () => {
    expect(cardStrength('3', 'clubs')).toBeGreaterThan(cardStrength('2', 'clubs'));
    expect(cardStrength('2', 'clubs')).toBeGreaterThan(cardStrength('A', 'clubs'));
    expect(cardStrength('A', 'clubs')).toBeGreaterThan(cardStrength('K', 'clubs'));
    expect(cardStrength('K', 'clubs')).toBeGreaterThan(cardStrength('J', 'clubs'));
    expect(cardStrength('J', 'clubs')).toBeGreaterThan(cardStrength('Q', 'clubs'));
    expect(cardStrength('Q', 'clubs')).toBeGreaterThan(cardStrength('7', 'clubs'));
    expect(cardStrength('7', 'clubs')).toBeGreaterThan(cardStrength('6', 'clubs'));
    expect(cardStrength('6', 'clubs')).toBeGreaterThan(cardStrength('5', 'clubs'));
    expect(cardStrength('5', 'clubs')).toBeGreaterThan(cardStrength('4', 'hearts'));
  });

  it('same rank different non-manilha suits are equal strength', () => {
    expect(cardStrength('3', 'clubs')).toBe(cardStrength('3', 'hearts'));
    expect(cardStrength('A', 'diamonds')).toBe(cardStrength('A', 'clubs'));
  });
});

describe('resolveRound', () => {
  it('player1 wins when their card is stronger', () => {
    const trick = makeTrick({ rank: '3', suit: 'clubs', strength: 10 }, { rank: '2', suit: 'clubs', strength: 9 }, null);
    expect(resolveRound(trick)).toBe('player1');
  });

  it('player2 wins when their card is stronger', () => {
    const trick = makeTrick({ rank: '2', suit: 'clubs', strength: 9 }, { rank: '3', suit: 'clubs', strength: 10 }, null);
    expect(resolveRound(trick)).toBe('player2');
  });

  it('tie when cards have equal strength', () => {
    const trick = makeTrick({ rank: '3', suit: 'clubs', strength: 10 }, { rank: '3', suit: 'hearts', strength: 10 }, null);
    expect(resolveRound(trick)).toBe('tie');
  });

  it('player2 wins if player1 has not played', () => {
    const trick = makeTrick(null, { rank: '3', suit: 'clubs', strength: 10 }, null);
    expect(resolveRound(trick)).toBe('player2');
  });
});

describe('resolveHand', () => {
  function wonTrick(winner: Seat | 'tie', round: 1 | 2 | 3 = 1): Trick {
    return makeTrick(
      { rank: '3', suit: 'clubs', strength: 10 },
      { rank: '2', suit: 'clubs', strength: 9 },
      winner,
      round,
    );
  }

  it('returns null when fewer than 2 tricks played', () => {
    expect(resolveHand([wonTrick('player1', 1)]).winner).toBeNull();
  });

  it('player1 wins by winning first two rounds', () => {
    const result = resolveHand([wonTrick('player1', 1), wonTrick('player1', 2)]);
    expect(result.winner).toBe('player1');
    expect(result.isDraw).toBe(false);
  });

  it('player1 wins rounds 1 and 3 when player2 wins round 2', () => {
    const result = resolveHand([
      wonTrick('player1', 1),
      wonTrick('player2', 2),
      wonTrick('player1', 3),
    ]);
    expect(result.winner).toBe('player1');
  });

  it('player2 wins rounds 1 and 3', () => {
    const result = resolveHand([
      wonTrick('player2', 1),
      wonTrick('player1', 2),
      wonTrick('player2', 3),
    ]);
    expect(result.winner).toBe('player2');
  });

  it('round 1 tie → round 2 winner takes hand', () => {
    const result = resolveHand([
      wonTrick('tie', 1),
      wonTrick('player2', 2),
    ]);
    expect(result.winner).toBe('player2');
  });

  it('round 1 win + round 2 tie → round 1 winner takes hand', () => {
    const result = resolveHand([
      wonTrick('player1', 1),
      wonTrick('tie', 2),
    ]);
    expect(result.winner).toBe('player1');
  });

  it('three ties → draw', () => {
    const result = resolveHand([
      wonTrick('tie', 1),
      wonTrick('tie', 2),
      wonTrick('tie', 3),
    ]);
    expect(result.winner).toBeNull();
    expect(result.isDraw).toBe(true);
  });

  it('round 1 tie, round 2 tie, player1 wins round 3', () => {
    const result = resolveHand([
      wonTrick('tie', 1),
      wonTrick('tie', 2),
      wonTrick('player1', 3),
    ]);
    expect(result.winner).toBe('player1');
    expect(result.isDraw).toBe(false);
  });
});
