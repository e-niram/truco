import { describe, it, expect } from 'vitest';
import {
  initialBetState,
  canCallTruco,
  canRaiseBet,
  applyCallTruco,
  applyRaiseBet,
  applyAcceptBet,
  applyRejectBet,
  nextBetLevel,
} from '../betting.ts';

describe('nextBetLevel', () => {
  it('follows the escalation sequence', () => {
    expect(nextBetLevel(2)).toBe(4);
    expect(nextBetLevel(4)).toBe(6);
    expect(nextBetLevel(6)).toBe(10);
    expect(nextBetLevel(10)).toBe(12);
    expect(nextBetLevel(12)).toBeNull();
  });
});

describe('canCallTruco', () => {
  it('allows calling when no bet is pending', () => {
    const bet = initialBetState();
    expect(canCallTruco(bet, 'player1')).toBe(true);
  });

  it('disallows calling when a bet is already pending', () => {
    const bet = { ...initialBetState(), status: 'pending' as const, pendingLevel: 4 as const, calledBy: 'player1' as const };
    expect(canCallTruco(bet, 'player2')).toBe(false);
  });

  it('disallows calling when already at max level', () => {
    const bet = { ...initialBetState(), currentLevel: 12 as const, status: 'accepted' as const };
    expect(canCallTruco(bet, 'player1')).toBe(false);
  });
});

describe('applyCallTruco', () => {
  it('sets pendingLevel to next level and status to pending', () => {
    const bet = initialBetState();
    const result = applyCallTruco(bet, 'player1');
    expect(result.pendingLevel).toBe(4);
    expect(result.status).toBe('pending');
    expect(result.calledBy).toBe('player1');
    expect(result.currentLevel).toBe(2); // unchanged until accepted
  });
});

describe('applyRaiseBet', () => {
  it('raises the pending level and switches caller', () => {
    const bet = applyCallTruco(initialBetState(), 'player1'); // pending at 4
    const raised = applyRaiseBet(bet, 'player2');
    expect(raised.currentLevel).toBe(4);
    expect(raised.pendingLevel).toBe(6);
    expect(raised.calledBy).toBe('player2');
  });
});

describe('applyAcceptBet', () => {
  it('confirms the pending level', () => {
    const bet = applyCallTruco(initialBetState(), 'player1'); // pending at 4
    const accepted = applyAcceptBet(bet);
    expect(accepted.currentLevel).toBe(4);
    expect(accepted.pendingLevel).toBeNull();
    expect(accepted.status).toBe('accepted');
  });
});

describe('applyRejectBet', () => {
  it('sets status to rejected', () => {
    const bet = applyCallTruco(initialBetState(), 'player1');
    const rejected = applyRejectBet(bet);
    expect(rejected.status).toBe('rejected');
    expect(rejected.pendingLevel).toBeNull();
  });
});

describe('canRaiseBet', () => {
  it('allows raise when opponent called and higher level exists', () => {
    const bet = applyCallTruco(initialBetState(), 'player1'); // player1 called
    expect(canRaiseBet(bet, 'player2')).toBe(true);
  });

  it('disallows raise by the same player who called', () => {
    const bet = applyCallTruco(initialBetState(), 'player1');
    expect(canRaiseBet(bet, 'player1')).toBe(false);
  });

  it('disallows raise when no bet is pending', () => {
    expect(canRaiseBet(initialBetState(), 'player2')).toBe(false);
  });

  it('disallows raise when at max level', () => {
    const bet = {
      currentLevel: 10 as const,
      pendingLevel: 12 as const,
      calledBy: 'player1' as const,
      status: 'pending' as const,
    };
    // player2 cannot raise above 12
    expect(canRaiseBet(bet, 'player2')).toBe(false);
  });
});
