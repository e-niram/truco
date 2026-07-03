// "Mão de 10" / "mão de ferro" — Truco Mineiro's special rules for match point.
//
// Mão de 10: once either player reaches 10 points, that hand automatically starts
// at 4 points and truco can no longer be called — calling it forfeits the match.
//
// Mão de ferro: once BOTH players are at 10, the hand is played "no escuro" (blind
// — neither player can see their own cards). Truco is still forbidden; whoever wins
// the hand wins the match.
export interface Score {
  player1: number;
  player2: number;
}

export function isTenHand(score: Score): boolean {
  return score.player1 >= 10 || score.player2 >= 10;
}

export function isIronHand(score: Score): boolean {
  return score.player1 >= 10 && score.player2 >= 10;
}

export function startingPointsAtStake(score: Score): 2 | 4 {
  return isTenHand(score) ? 4 : 2;
}
