import type { Seat } from './types.ts';

// "Mão de 10" / "mão de ferro" — Truco Mineiro's special rules for match point.
//
// Mão de 10: once exactly one player reaches 10 points, that player looks at their
// cards and decides before any card is played: play the hand for 4 points, or run
// ("correr") and hand the opponent 2 points. Truco can no longer be called — calling
// it anyway hands the opponent 4 points.
//
// Mão de ferro: once BOTH players are at 10, the hand is played "no escuro" (blind
// — neither player can see their own cards). Nobody decides, nobody can run, truco is
// still forbidden; whoever wins the hand wins the match.
export interface Score {
  player1: number;
  player2: number;
}

export const TEN_HAND_RUN_POINTS = 2;
export const TEN_HAND_TRUCO_PENALTY = 4;

export function isTenHand(score: Score): boolean {
  return score.player1 >= 10 || score.player2 >= 10;
}

export function isIronHand(score: Score): boolean {
  return score.player1 >= 10 && score.player2 >= 10;
}

// The player who must choose between playing and running in a mão de 10
// (null in a normal hand and in a mão de ferro).
export function tenHandDecider(score: Score): Seat | null {
  if (!isTenHand(score) || isIronHand(score)) return null;
  return score.player1 >= 10 ? 'player1' : 'player2';
}

export function startingPointsAtStake(score: Score): 2 | 4 {
  return isTenHand(score) ? 4 : 2;
}
