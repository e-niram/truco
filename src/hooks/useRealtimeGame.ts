import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/store/gameStore';
import type { PublicGameState, Card, Seat } from '@/engine/types';

export function useRealtimeGame(
  gameId: string | undefined,
  mySeat: Seat | null,
  myToken: string,
) {
  const { setPublicState, setMyHand, setConnected } = useGameStore();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!gameId) return;

    // 1. Public channel — state visible to both players
    const publicChannel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const incoming = payload.new as { public_state: PublicGameState; version: number };
          if (incoming?.public_state) {
            setPublicState({ ...incoming.public_state, version: incoming.version });
          }
        },
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    channelsRef.current = [publicChannel];

    // 2. Private channel — own hand (only subscribable if we know our seat)
    if (mySeat) {
      const privateChannel = supabase
        .channel(`game:${gameId}:${mySeat}:${myToken}`)
        .on('broadcast', { event: 'hand' }, (payload) => {
          const { hand } = payload.payload as { hand: Card[] };
          if (hand) setMyHand(hand);
        })
        .subscribe();

      channelsRef.current.push(privateChannel);
    }

    return () => {
      channelsRef.current.forEach((ch) => void supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [gameId, mySeat, myToken, setPublicState, setMyHand, setConnected]);
}
