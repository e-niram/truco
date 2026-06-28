import { describe, it, expect } from 'vitest';
import { gameReducer, derivePublicState, GameError } from '../gameReducer.ts';
import type { GameState, Card } from '../types.ts';

function emptyState(gameId = 'test-game'): GameState {
  return {
    gameId,
    phase: 'waiting',
    players: { player1: null, player2: null },
    score: { player1: 0, player2: 0 },
    currentHand: null,
    handHistory: [],
    version: 0,
  };
}

function stateWithBothPlayers(): GameState {
  let state = emptyState();
  state = gameReducer(state, { type: 'JOIN_GAME', seat: 'player1', token: 'tok1' });
  state = gameReducer(state, { type: 'JOIN_GAME', seat: 'player2', token: 'tok2' });
  return state;
}

function makeCard(rank: string, suit: string, strength: number): Card {
  return {
    rank: rank as never,
    suit: suit as never,
    id: `${rank}-${suit}`,
    isManilha: false,
    strength,
  };
}

describe('JOIN_GAME', () => {
  it('adds player1 and stays in waiting phase', () => {
    const state = gameReducer(emptyState(), { type: 'JOIN_GAME', seat: 'player1', token: 'tok1' });
    expect(state.players.player1).toBeTruthy();
    expect(state.phase).toBe('waiting');
    expect(state.currentHand).toBeNull();
  });

  it('transitions to active when both players join', () => {
    const state = stateWithBothPlayers();
    expect(state.phase).toBe('active');
    expect(state.currentHand).toBeTruthy();
    expect(state.currentHand?.phase).toBe('dealing');
  });

  it('increments version', () => {
    const state = gameReducer(emptyState(), { type: 'JOIN_GAME', seat: 'player1', token: 'tok1' });
    expect(state.version).toBe(1);
  });

  it('throws when seat is already taken', () => {
    const state = gameReducer(emptyState(), { type: 'JOIN_GAME', seat: 'player1', token: 'tok1' });
    expect(() => gameReducer(state, { type: 'JOIN_GAME', seat: 'player1', token: 'tok2' })).toThrow(GameError);
  });
});

describe('DEAL_HAND', () => {
  it('deals 3 cards to each player and moves to playing', () => {
    const after = gameReducer(stateWithBothPlayers(), { type: 'DEAL_HAND' });
    expect(after.players.player1?.hand).toHaveLength(3);
    expect(after.players.player2?.hand).toHaveLength(3);
    expect(after.currentHand?.phase).toBe('playing');
  });

  it('deals unique cards to each player', () => {
    const after = gameReducer(stateWithBothPlayers(), { type: 'DEAL_HAND' });
    const ids1 = after.players.player1!.hand.map((c) => c.id);
    const ids2 = after.players.player2!.hand.map((c) => c.id);
    const overlap = ids1.filter((id) => ids2.includes(id));
    expect(overlap).toHaveLength(0);
  });
});

describe('PLAY_CARD', () => {
  function dealtState(): GameState {
    return gameReducer(stateWithBothPlayers(), { type: 'DEAL_HAND' });
  }

  it('removes the played card from the player hand', () => {
    const state = dealtState();
    const card = state.players.player1!.hand[0];
    const after = gameReducer(state, { type: 'PLAY_CARD', seat: 'player1', cardId: card.id });
    expect(after.players.player1!.hand).toHaveLength(2);
    expect(after.players.player1!.hand.find((c) => c.id === card.id)).toBeUndefined();
  });

  it('switches turn to opponent after playing', () => {
    const state = dealtState();
    const card = state.players.player1!.hand[0];
    const after = gameReducer(state, { type: 'PLAY_CARD', seat: 'player1', cardId: card.id });
    expect(after.currentHand?.currentTurn).toBe('player2');
  });

  it('throws when playing out of turn', () => {
    const state = dealtState();
    const card = state.players.player2!.hand[0];
    expect(() => gameReducer(state, { type: 'PLAY_CARD', seat: 'player2', cardId: card.id })).toThrow(GameError);
  });

  it('throws when card not in hand', () => {
    const state = dealtState();
    expect(() => gameReducer(state, { type: 'PLAY_CARD', seat: 'player1', cardId: 'fake-card' })).toThrow(GameError);
  });
});

describe('Betting flow', () => {
  function dealtState(): GameState {
    return gameReducer(stateWithBothPlayers(), { type: 'DEAL_HAND' });
  }

  it('CALL_TRUCO moves to betting phase', () => {
    const state = dealtState();
    const after = gameReducer(state, { type: 'CALL_TRUCO', seat: 'player1' });
    expect(after.currentHand?.phase).toBe('betting');
    expect(after.currentHand?.bet.pendingLevel).toBe(4);
  });

  it('ACCEPT_BET updates pointsAtStake and returns to playing', () => {
    let state = dealtState();
    state = gameReducer(state, { type: 'CALL_TRUCO', seat: 'player1' });
    state = gameReducer(state, { type: 'ACCEPT_BET', seat: 'player2' });
    expect(state.currentHand?.phase).toBe('playing');
    expect(state.currentHand?.pointsAtStake).toBe(4);
  });

  it('REJECT_BET awards points to caller and ends hand', () => {
    let state = dealtState();
    state = gameReducer(state, { type: 'CALL_TRUCO', seat: 'player1' });
    state = gameReducer(state, { type: 'REJECT_BET', seat: 'player2' });
    expect(state.score.player1).toBe(2); // current level before raise = 2
    expect(state.currentHand?.phase).toBe('handOver');
  });

  it('full bet escalation: truco → seis → dez', () => {
    let state = dealtState();
    state = gameReducer(state, { type: 'CALL_TRUCO', seat: 'player1' });  // 4 pending
    state = gameReducer(state, { type: 'RAISE_BET', seat: 'player2' });   // 6 pending
    state = gameReducer(state, { type: 'RAISE_BET', seat: 'player1' });   // 10 pending
    state = gameReducer(state, { type: 'ACCEPT_BET', seat: 'player2' });  // accepted at 10
    expect(state.currentHand?.pointsAtStake).toBe(10);
    expect(state.currentHand?.phase).toBe('playing');
  });
});

describe('Score tracking', () => {
  it('awards points to hand winner', () => {
    // Build a state where player1 wins all 3 tricks manually
    const initial = gameReducer(stateWithBothPlayers(), { type: 'DEAL_HAND' });

    // Replace hands with known cards so we control the outcome
    const strongCard1 = makeCard('4', 'clubs', 14); // strongest manilha
    const strongCard2 = makeCard('7', 'hearts', 13);
    const strongCard3 = makeCard('A', 'spades', 12);
    const weakCard1 = makeCard('4', 'hearts', 1);
    const weakCard2 = makeCard('5', 'clubs', 2);
    const weakCard3 = makeCard('6', 'clubs', 3);

    const rigged: GameState = {
      ...initial,
      players: {
        player1: { ...initial.players.player1!, hand: [strongCard1, strongCard2, strongCard3] },
        player2: { ...initial.players.player2!, hand: [weakCard1, weakCard2, weakCard3] },
      },
    };

    // Play through two rounds (player1 wins both → hand over)
    let s = rigged;
    s = gameReducer(s, { type: 'PLAY_CARD', seat: 'player1', cardId: strongCard1.id });
    s = gameReducer(s, { type: 'PLAY_CARD', seat: 'player2', cardId: weakCard1.id });
    s = gameReducer(s, { type: 'PLAY_CARD', seat: 'player1', cardId: strongCard2.id });
    s = gameReducer(s, { type: 'PLAY_CARD', seat: 'player2', cardId: weakCard2.id });

    expect(s.currentHand?.phase).toBe('handOver');
    expect(s.currentHand?.winner).toBe('player1');
    expect(s.score.player1).toBe(2);
    expect(s.score.player2).toBe(0);
  });
});

describe('derivePublicState', () => {
  it('excludes player hands from public state', () => {
    const state = gameReducer(stateWithBothPlayers(), { type: 'DEAL_HAND' });
    const pub = derivePublicState(state);
    expect(pub.players.player1).toBeTruthy();
    expect(pub.players.player2).toBeTruthy();
    // PublicPlayer has cardCount, not hand
    expect((pub.players.player1 as { cardCount?: number }).cardCount).toBe(3);
    expect('hand' in (pub.players.player1 ?? {})).toBe(false);
  });

  it('preserves score and version', () => {
    const state = stateWithBothPlayers();
    const pub = derivePublicState(state);
    expect(pub.score).toEqual(state.score);
    expect(pub.version).toBe(state.version);
  });
});
