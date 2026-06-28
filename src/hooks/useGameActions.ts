import { useCallback } from 'react';
import { supabase, FUNCTIONS_URL } from '@/lib/supabase';
import type { GameAction, Seat } from '@/engine/types';

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function postAction(gameId: string, token: string, action: GameAction): Promise<void> {
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

  const result = await res.json() as { ok: boolean; error?: string; retry?: boolean };
  if (!result.ok) {
    if (result.retry) {
      // Conflict — retry once after a short delay
      await new Promise((r) => setTimeout(r, 100));
      return postAction(gameId, token, action);
    }
    throw new Error(result.error ?? 'Action failed');
  }
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
    (cardId: string) => {
      if (!mySeat) return Promise.reject(new Error('No seat'));
      return dispatch({ type: 'PLAY_CARD', seat: mySeat, cardId });
    },
    [dispatch, mySeat],
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

  return { joinGame, playCard, callTruco, raiseBet, acceptBet, rejectBet, startNextHand };
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
