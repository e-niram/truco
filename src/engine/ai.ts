import type { BetState, Card, Trick, Seat } from './types';
import { canRaiseBet } from './betting';

const AI_SEAT: Seat = 'player2';

function handStrengthScore(hand: Card[]): number {
  return hand.reduce((sum, c) => sum + c.strength + (c.isManilha ? 4 : 0), 0);
}

export type HandStrength = 'weak' | 'medium' | 'strong';

export function estimateHandStrength(hand: Card[]): HandStrength {
  const score = handStrengthScore(hand);
  if (score >= 30) return 'strong';
  if (score >= 16) return 'medium';
  return 'weak';
}

// Following: play the cheapest card that still wins the round, else the cheapest card.
// Leading: play the weakest non-manilha, saving manilhas for later rounds.
export function chooseCardToPlay(hand: Card[], currentTrick: Trick, seat: Seat = AI_SEAT): Card {
  const opponentCard = seat === 'player1' ? currentTrick.player2Card : currentTrick.player1Card;
  const sorted = [...hand].sort((a, b) => a.strength - b.strength);

  if (opponentCard) {
    const winning = sorted.find((c) => c.strength > opponentCard.strength);
    return winning ?? sorted[0];
  }

  const nonManilha = sorted.find((c) => !c.isManilha);
  return nonManilha ?? sorted[0];
}

export function shouldCallTruco(hand: Card[]): boolean {
  return estimateHandStrength(hand) === 'strong';
}

export type BetResponse = 'accept' | 'raise' | 'reject';

export function decideBetResponse(hand: Card[], bet: BetState, seat: Seat = AI_SEAT): BetResponse {
  const strength = estimateHandStrength(hand);
  if (strength === 'strong') {
    return canRaiseBet(bet, seat) ? 'raise' : 'accept';
  }
  if (strength === 'medium') return 'accept';
  return 'reject';
}
