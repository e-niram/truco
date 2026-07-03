import { describe, it, expect } from 'vitest';
import { gameReducer } from '../gameReducer.ts';
import { canCallTruco } from '../betting.ts';
import { chooseCardToPlay, decideBetResponse, shouldCallTruco } from '../ai.ts';
import type { GameAction, GameState } from '../types.ts';

// Mirrors useSoloGame's aiNextAction + autoDeal + apply loop, but synchronous —
// proves a full solo match plays to completion without the loop getting stuck.

function buildInitialState(): GameState {
  return {
    gameId: 'solo',
    phase: 'waiting',
    players: { player1: null, player2: null },
    score: { player1: 0, player2: 0 },
    currentHand: null,
    handHistory: [],
    version: 0,
  };
}

function autoDeal(state: GameState): GameState {
  if (state.currentHand?.phase === 'dealing') {
    return gameReducer(state, { type: 'DEAL_HAND' });
  }
  return state;
}

function aiNextAction(state: GameState): GameAction | null {
  const hand = state.currentHand;
  if (!hand) return null;
  const aiHand = state.players.player2?.hand ?? [];
  if (hand.phase === 'betting' && hand.bet.status === 'pending' && hand.bet.calledBy !== 'player2') {
    const response = decideBetResponse(aiHand, hand.bet);
    if (response === 'reject') return { type: 'REJECT_BET', seat: 'player2' };
    if (response === 'raise') return { type: 'RAISE_BET', seat: 'player2' };
    return { type: 'ACCEPT_BET', seat: 'player2' };
  }
  if (hand.phase === 'playing' && hand.currentTurn === 'player2') {
    if (shouldCallTruco(aiHand) && canCallTruco(hand.bet, 'player2')) {
      return { type: 'CALL_TRUCO', seat: 'player2' };
    }
    const card = chooseCardToPlay(aiHand, hand.currentTrick, 'player2');
    return { type: 'PLAY_CARD', seat: 'player2', cardId: card.id };
  }
  return null;
}

// A simple human policy: always accept bets, play first legal card, occasionally call truco.
function humanAction(state: GameState, turnCount: number): GameAction | null {
  const hand = state.currentHand;
  if (!hand) return null;
  const myHand = state.players.player1?.hand ?? [];
  if (hand.phase === 'betting' && hand.bet.status === 'pending' && hand.bet.calledBy !== 'player1') {
    return { type: 'ACCEPT_BET', seat: 'player1' };
  }
  if (hand.phase === 'playing' && hand.currentTurn === 'player1') {
    // every 7th human turn, call truco if legal, to exercise the human-initiated bet path
    if (turnCount % 7 === 0 && canCallTruco(hand.bet, 'player1')) {
      return { type: 'CALL_TRUCO', seat: 'player1' };
    }
    return { type: 'PLAY_CARD', seat: 'player1', cardId: myHand[0].id };
  }
  return null;
}

describe('solo match simulation', () => {
  it('plays a full match to completion without getting stuck', () => {
    let state = buildInitialState();
    state = gameReducer(state, { type: 'JOIN_GAME', seat: 'player1', token: 'human' });
    state = gameReducer(state, { type: 'JOIN_GAME', seat: 'player2', token: 'ai' });
    state = autoDeal(state);

    let steps = 0;
    let humanTurns = 0;
    const MAX_STEPS = 5000;

    while (state.phase !== 'finished' && steps < MAX_STEPS) {
      steps++;
      const hand = state.currentHand;
      if (!hand) break;

      if (hand.phase === 'handOver') {
        state = autoDeal(gameReducer(state, { type: 'START_NEXT_HAND' }));
        continue;
      }
      if (hand.phase === 'matchOver') break;

      const ai = aiNextAction(state);
      if (ai) {
        state = autoDeal(gameReducer(state, ai));
        continue;
      }
      const human = humanAction(state, humanTurns++);
      if (human) {
        state = autoDeal(gameReducer(state, human));
        continue;
      }
      // Nobody can act — this is the "stuck" failure we're guarding against.
      throw new Error(
        `Loop stuck: phase=${hand.phase} turn=${hand.currentTurn} betStatus=${hand.bet.status} calledBy=${hand.bet.calledBy}`,
      );
    }

    expect(steps).toBeLessThan(MAX_STEPS);
    expect(state.phase).toBe('finished');
    const maxScore = Math.max(state.score.player1, state.score.player2);
    expect(maxScore).toBeGreaterThanOrEqual(12);
  });

  it('runs 50 full matches without ever getting stuck', () => {
    for (let i = 0; i < 50; i++) {
      let state = buildInitialState();
      state = gameReducer(state, { type: 'JOIN_GAME', seat: 'player1', token: 'human' });
      state = gameReducer(state, { type: 'JOIN_GAME', seat: 'player2', token: 'ai' });
      state = autoDeal(state);
      let steps = 0;
      let humanTurns = 0;
      while (state.phase !== 'finished' && steps < 5000) {
        steps++;
        const hand = state.currentHand;
        if (!hand) break;
        if (hand.phase === 'handOver') {
          state = autoDeal(gameReducer(state, { type: 'START_NEXT_HAND' }));
          continue;
        }
        if (hand.phase === 'matchOver') break;
        const ai = aiNextAction(state);
        if (ai) { state = autoDeal(gameReducer(state, ai)); continue; }
        const human = humanAction(state, humanTurns++);
        if (human) { state = autoDeal(gameReducer(state, human)); continue; }
        throw new Error(`Match ${i} stuck: phase=${hand.phase} turn=${hand.currentTurn}`);
      }
      expect(state.phase).toBe('finished');
    }
  });
});
