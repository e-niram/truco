import type { BetLevel, BetState, Seat } from './types.ts';

const BET_SEQUENCE: BetLevel[] = [2, 4, 6, 10, 12];

export function initialBetState(): BetState {
  return {
    currentLevel: 2,
    pendingLevel: null,
    calledBy: null,
    status: 'none',
  };
}

export function nextBetLevel(current: BetLevel): BetLevel | null {
  const idx = BET_SEQUENCE.indexOf(current);
  return idx < BET_SEQUENCE.length - 1 ? BET_SEQUENCE[idx + 1] : null;
}

export function canCallTruco(bet: BetState, seat: Seat): boolean {
  // Can only call if: no pending bet, and we didn't call the last one
  if (bet.status === 'pending') return false;
  if (bet.currentLevel === 12) return false;
  // Cannot re-raise if you were the last one to call
  if (bet.calledBy === seat && bet.status === 'accepted') return false;
  return true;
}

export function canRaiseBet(bet: BetState, seat: Seat): boolean {
  // Can only raise if there is a pending bet aimed at you
  if (bet.status !== 'pending') return false;
  if (bet.calledBy === seat) return false; // can't raise your own call
  const next = nextBetLevel(bet.pendingLevel ?? bet.currentLevel);
  return next !== null;
}

export function applyCallTruco(bet: BetState, seat: Seat): BetState {
  const next = nextBetLevel(bet.currentLevel);
  if (!next) return bet;
  return {
    ...bet,
    pendingLevel: next,
    calledBy: seat,
    status: 'pending',
  };
}

export function applyRaiseBet(bet: BetState, seat: Seat): BetState {
  const next = nextBetLevel(bet.pendingLevel ?? bet.currentLevel);
  if (!next) return bet;
  return {
    ...bet,
    currentLevel: bet.pendingLevel ?? bet.currentLevel,
    pendingLevel: next,
    calledBy: seat,
    status: 'pending',
  };
}

export function applyAcceptBet(bet: BetState): BetState {
  return {
    ...bet,
    currentLevel: bet.pendingLevel ?? bet.currentLevel,
    pendingLevel: null,
    status: 'accepted',
  };
}

export function applyRejectBet(bet: BetState): BetState {
  return {
    ...bet,
    pendingLevel: null,
    status: 'rejected',
  };
}
