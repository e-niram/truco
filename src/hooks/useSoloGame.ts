import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { gameReducer, derivePublicState } from '@/engine/gameReducer';
import { canCallTruco } from '@/engine/betting';
import { chooseCardToPlay, decideBetResponse, shouldCallTruco } from '@/engine/ai';
import type { GameAction, GameState } from '@/engine/types';

const AI_TOKEN = 'ai';
const AI_THINK_DELAY_MS = 800;

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

// Mirrors the server's action Edge Function: a hand entering 'dealing' is dealt immediately.
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

// Runs a full Truco Mineiro match locally against a heuristic AI opponent (player2) —
// no network/Supabase involved. Exposes the same method names as useGameActions so
// GameBoard can use either interchangeably.
export function useSoloGame(enabled: boolean, myToken: string) {
  const stateRef = useRef<GameState>(buildInitialState());
  const initializedRef = useRef(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function sync() {
    const { forceSetPublicState, setMyHand } = useGameStore.getState();
    forceSetPublicState(derivePublicState(stateRef.current));
    setMyHand(stateRef.current.players.player1?.hand ?? []);
  }

  function apply(action: GameAction) {
    stateRef.current = autoDeal(gameReducer(stateRef.current, action));
    sync();
    scheduleAiCheck();
  }

  function scheduleAiCheck() {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      const action = aiNextAction(stateRef.current);
      if (action) apply(action);
    }, AI_THINK_DELAY_MS);
  }

  function startNewGame() {
    let state = buildInitialState();
    state = gameReducer(state, { type: 'JOIN_GAME', seat: 'player1', token: myToken });
    state = gameReducer(state, { type: 'JOIN_GAME', seat: 'player2', token: AI_TOKEN });
    stateRef.current = autoDeal(state);

    const { setMySeat, setConnected } = useGameStore.getState();
    setMySeat('player1');
    setConnected(true);
    sync();
    scheduleAiCheck();
  }

  useEffect(() => {
    if (!enabled) return;
    if (!initializedRef.current) {
      initializedRef.current = true;
      startNewGame();
    }
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    playCard: async (cardId: string) => apply({ type: 'PLAY_CARD', seat: 'player1', cardId }),
    callTruco: async () => apply({ type: 'CALL_TRUCO', seat: 'player1' }),
    raiseBet: async () => apply({ type: 'RAISE_BET', seat: 'player1' }),
    acceptBet: async () => apply({ type: 'ACCEPT_BET', seat: 'player1' }),
    rejectBet: async () => apply({ type: 'REJECT_BET', seat: 'player1' }),
    startNextHand: async () => apply({ type: 'START_NEXT_HAND' }),
    reconnect: async () => {},
    joinGame: async () => {},
    restart: () => startNewGame(),
  };
}
