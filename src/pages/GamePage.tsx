import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayerIdentity } from '@/hooks/usePlayerIdentity';
import { useRealtimeGame } from '@/hooks/useRealtimeGame';
import { useGameActions, fetchPublicState } from '@/hooks/useGameActions';
import { useGameStore } from '@/store/gameStore';
import { GameBoard } from '@/components/game/GameBoard';
import type { PublicGameState, Seat } from '@/engine/types';

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { token } = usePlayerIdentity();
  const navigate = useNavigate();

  const { mySeat, publicState, myHand, setPublicState, setMySeat, setMyHand } = useGameStore();
  const actions = useGameActions(gameId, token, mySeat);
  const joinedRef = useRef(false);

  // Load initial state and determine our seat
  useEffect(() => {
    if (!gameId) return;

    async function init() {
      const state = await fetchPublicState(gameId!);
      if (!state) {
        navigate('/');
        return;
      }

      const pub = state as PublicGameState;
      setPublicState(pub);

      // Figure out which seat we are (if any)
      // We need private_state tokens to verify — the server does this,
      // but we can infer from public state after joining.
      // If the game is waiting and we're not player1, attempt to join as player2.
      if (pub.phase === 'waiting' && pub.players.player2 === null && !joinedRef.current) {
        joinedRef.current = true;
        try {
          const result = await actions.joinGame();
          setMySeat('player2');
          // Hand is returned in the response to avoid the broadcast race condition
          const hand = (result as { hand?: unknown }).hand;
          if (Array.isArray(hand) && hand.length > 0) {
            setMyHand(hand as import('@/engine/types').Card[]);
          }
        } catch {
          // If join fails, we might already be player1
          setMySeat('player1');
        }
      } else {
        // We're a returning player — try player1 first (stored in localStorage association)
        // The seat is inferred; private hand delivery will confirm it
        const storedSeat = localStorage.getItem(`truco_seat_${gameId}`) as Seat | null;
        if (storedSeat) {
          setMySeat(storedSeat);
        } else if (pub.players.player1) {
          // Default: assume we're player1 if game was created from this device
          setMySeat('player1');
        }
      }
    }

    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Store seat in localStorage for reconnects
  useEffect(() => {
    if (gameId && mySeat) {
      localStorage.setItem(`truco_seat_${gameId}`, mySeat);
    }
  }, [gameId, mySeat]);

  // Subscribe to realtime channels
  useRealtimeGame(gameId, mySeat, token);

  // If game is active but we have no hand (missed initial broadcast), request re-delivery.
  // RECONNECT triggers the server to broadcast hands again.
  useEffect(() => {
    if (publicState?.phase !== 'active' || !mySeat || myHand.length > 0) return;
    void actions.reconnect().catch(() => {});
  // Only re-run when phase changes to active or seat is assigned — not on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicState?.phase, mySeat]);

  if (!gameId) {
    return null;
  }

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--color-table)' }}>
      <GameBoard gameId={gameId} token={token} />
    </div>
  );
}
