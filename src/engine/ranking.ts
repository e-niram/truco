import type { Rank, Suit, Trick, Seat } from './types.ts';

// Fixed manilhas in strength order (strongest first)
const MANILHA_ORDER: Array<{ rank: Rank; suit: Suit }> = [
  { rank: '4', suit: 'clubs' },   // Zap — strongest
  { rank: '7', suit: 'hearts' },  // Copeta
  { rank: 'A', suit: 'spades' },  // Espadilha
  { rank: '7', suit: 'diamonds' }, // Pica-fumo — weakest manilha
];

// Non-manilha rank order (highest value first)
const RANK_STRENGTH: Record<Rank, number> = {
  '3': 10,
  '2': 9,
  'A': 8,
  'K': 7,
  'J': 6,
  'Q': 5,
  '7': 4,
  '6': 3,
  '5': 2,
  '4': 1,
};

// Manilhas get strengths 11–14 (above all normal cards)
const MANILHA_BASE_STRENGTH = 11;

export function isManilha(rank: Rank, suit: Suit): boolean {
  return MANILHA_ORDER.some((m) => m.rank === rank && m.suit === suit);
}

export function cardStrength(rank: Rank, suit: Suit): number {
  const manilhaIndex = MANILHA_ORDER.findIndex(
    (m) => m.rank === rank && m.suit === suit,
  );
  if (manilhaIndex !== -1) {
    // Index 0 is strongest manilha → highest strength
    return MANILHA_BASE_STRENGTH + (MANILHA_ORDER.length - 1 - manilhaIndex);
  }
  return RANK_STRENGTH[rank] ?? 0;
}

export function buildCardId(rank: Rank, suit: Suit): string {
  return `${rank}-${suit}`;
}

export function resolveRound(trick: Trick): Seat | 'tie' {
  const c1 = trick.player1Card;
  const c2 = trick.player2Card;

  if (!c1 && !c2) return 'tie';
  if (!c1) return 'player2';
  if (!c2) return 'player1';

  if (c1.strength > c2.strength) return 'player1';
  if (c2.strength > c1.strength) return 'player2';
  return 'tie';
}

// Determine the hand winner from completed tricks.
// Truco Mineiro tie-break rules:
//   - If round 1 is a tie → whoever wins round 2 wins the hand (or round 3 if also tie)
//   - If a player wins round 1 and round 2 ties → round 1 winner wins the hand
//   - If both players each win one round → round 3 decides
//   - Three ties → no points awarded (hand is a draw; re-deal)
export function resolveHand(
  tricks: Trick[],
): { winner: Seat | null; isDraw: boolean } {
  if (tricks.length < 2) return { winner: null, isDraw: false };

  const [r1, r2, r3] = tricks;

  // Round 1 win — check if round 2 confirms or forces round 3
  if (r1.winner !== 'tie' && r1.winner !== null) {
    if (r2.winner === r1.winner || r2.winner === 'tie') {
      return { winner: r1.winner, isDraw: false };
    }
    // r2 winner is the other player → need round 3
    if (r3) {
      if (r3.winner === 'tie') {
        // Round 1 winner takes it on tie-break
        return { winner: r1.winner, isDraw: false };
      }
      return { winner: r3.winner ?? null, isDraw: false };
    }
    return { winner: null, isDraw: false }; // round 3 not yet played
  }

  // Round 1 tie — round 2 decides
  if (r1.winner === 'tie') {
    if (r2.winner !== 'tie' && r2.winner !== null) {
      return { winner: r2.winner, isDraw: false };
    }
    // Both ties so far — need round 3
    if (r3) {
      if (r3.winner === 'tie') {
        return { winner: null, isDraw: true }; // three ties = draw
      }
      return { winner: r3.winner ?? null, isDraw: false };
    }
    return { winner: null, isDraw: false };
  }

  return { winner: null, isDraw: false };
}

// Re-export so callers can build Card objects without importing ranking internals
export { MANILHA_ORDER };
