import { useCallback } from 'react';
import { supabase, FUNCTIONS_URL } from '@/lib/supabase';
import type { GameAction, GameState, PublicGameState, Card, Seat, Rank, Suit } from '@/engine/types';
import { gameReducer, derivePublicState } from '@/engine/gameReducer';
import { useGameStore } from '@/store/gameStore';

function buildLocalGameState(
  publicState: PublicGameState,
  myHand: Card[],
  mySeat: Seat,
  token: string,
): GameState {
  const opponentSeat: Seat = mySeat === 'player1' ? 'player2' : 'player1';
  const opponentCount = publicState.players[opponentSeat]?.cardCount ?? 0;
  const fakeHand: Card[] = Array.from({ length: opponentCount }, (_, i) => ({
    id: `__opt__${i}`, rank: '2' as Rank, suit: 'clubs' as Suit, isManilha: false, strength: 0,
  }));
  return {
    gameId: publicState.gameId,
    phase: publicState.phase,
    players: {
      player1: publicState.players.player1 ? {
        seat: 'player1',
        token: mySeat === 'player1' ? token : '',
        hand: mySeat === 'player1' ? myHand : fakeHand,
        isConnected: publicState.players.player1.isConnected,
      } : null,
      player2: publicState.players.player2 ? {
        seat: 'player2',
        token: mySeat === 'player2' ? token : '',
        hand: mySeat === 'player2' ? myHand : fakeHand,
        isConnected: publicState.players.player2.isConnected,
      } : null,
    },
    score: publicState.score,
    currentHand: publicState.currentHand,
    handHistory: [],
    version: publicState.version,
  };
}

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function postAction(
  gameId: string,
  token: string,
  action: GameAction,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${FUNCTIONS_URL}/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ gameId, token, action }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  const result = await res.json() as { ok: boolean; error?: string; retry?: boolean; hand?: Card[] };
  if (!result.ok) {
    if (result.retry) {
      // Conflict — retry once after a short delay
      await new Promise((r) => setTimeout(r, 100));
      return postAction(gameId, token, action);
    }
    throw new Error(result.error ?? 'Action failed');
  }
  return result as Record<string, unknown>;
}

export function useGameActions(gameId: string | undefined, token: string, mySeat: Seat | null) {
  const dispatch = useCallback(
    (action: GameAction) => {
      if (!gameId) return Promise.reject(new Error('No game'));
      return postAction(gameId, token, action);
    },
    [gameId, token],
  );

  const joinGame = useCallback(
    () => dispatch({ type: 'JOIN_GAME', seat: mySeat ?? 'player2', token }),
    [dispatch, mySeat, token],
  );

  const playCard = useCallback(
    async (cardId: string) => {
      if (!mySeat) return Promise.reject(new Error('No seat'));

      const { publicState, myHand, forceSetPublicState, setMyHand } = useGameStore.getState();
      const prevPublicState = publicState;
      const prevHand = myHand;

      if (publicState) {
        try {
          const localState = buildLocalGameState(publicState, myHand, mySeat, token);
          const next = gameReducer(localState, { type: 'PLAY_CARD', seat: mySeat, cardId });
          forceSetPublicState(derivePublicState(next));
          setMyHand(next.players[mySeat]!.hand);
        } catch {
          // proceed without optimistic update if local reducer fails
        }
      }

      try {
        return await dispatch({ type: 'PLAY_CARD', seat: mySeat, cardId });
      } catch (err) {
        if (prevPublicState) forceSetPublicState(prevPublicState);
        setMyHand(prevHand);
        throw err;
      }
    },
    [dispatch, mySeat, token],
  );

  const callTruco = useCallback(
    () => {
      if (!mySeat) return Promise.reject(new Error('No seat'));
      return dispatch({ type: 'CALL_TRUCO', seat: mySeat });
    },
    [dispatch, mySeat],
  );

  const raiseBet = useCallback(
    () => {
      if (!mySeat) return Promise.reject(new Error('No seat'));
      return dispatch({ type: 'RAISE_BET', seat: mySeat });
    },
    [dispatch, mySeat],
  );

  const acceptBet = useCallback(
    () => {
      if (!mySeat) return Promise.reject(new Error('No seat'));
      return dispatch({ type: 'ACCEPT_BET', seat: mySeat });
    },
    [dispatch, mySeat],
  );

  const rejectBet = useCallback(
    () => {
      if (!mySeat) return Promise.reject(new Error('No seat'));
      return dispatch({ type: 'REJECT_BET', seat: mySeat });
    },
    [dispatch, mySeat],
  );

  const startNextHand = useCallback(
    () => dispatch({ type: 'START_NEXT_HAND' }),
    [dispatch],
  );

  const reconnect = useCallback(
    () => {
      if (!mySeat) return Promise.reject(new Error('No seat'));
      return dispatch({ type: 'RECONNECT', seat: mySeat, token });
    },
    [dispatch, mySeat, token],
  );

  return { joinGame, playCard, callTruco, raiseBet, acceptBet, rejectBet, startNextHand, reconnect };
}

// Utility: create a new game via the create-game Edge Function
export async function createGame(playerToken: string): Promise<string> {
  const res = await fetch(`${FUNCTIONS_URL}/create-game`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ playerToken }),
  });

  if (!res.ok) throw new Error('Failed to create game');
  const { gameId } = await res.json() as { gameId: string };
  return gameId;
}

// Load the initial public state for a game by ID
export async function fetchPublicState(gameId: string) {
  const { data, error } = await supabase
    .from('games')
    .select('public_state, version')
    .eq('id', gameId)
    .single();

  if (error || !data) return null;
  return { ...(data.public_state as object), version: data.version };
}
