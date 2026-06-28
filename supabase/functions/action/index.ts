import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { GameAction, GameState, Seat } from '../_shared/engine/types.ts';
import { gameReducer, derivePublicState, GameError } from '../_shared/engine/gameReducer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ActionRequest = {
  gameId: string;
  token: string;
  action: GameAction;
};

function resolveSeat(state: GameState, token: string): Seat {
  if (state.players.player1?.token === token) return 'player1';
  if (state.players.player2?.token === token) return 'player2';
  throw new GameError('Invalid token');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json() as ActionRequest;
    const { gameId, token, action } = body;

    if (!gameId || !token || !action) {
      return new Response(JSON.stringify({ error: 'gameId, token, and action required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Load current full state
    const { data: row, error: fetchError } = await supabase
      .from('games')
      .select('private_state, version')
      .eq('id', gameId)
      .single();

    if (fetchError || !row) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentState = row.private_state as GameState;
    const currentVersion = row.version as number;

    // Validate token and resolve seat
    let seat: Seat;
    try {
      seat = resolveSeat(currentState, token);
    } catch {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Special handling for JOIN_GAME — seat comes from server, not client
    let actionToApply = action;
    if (action.type === 'JOIN_GAME') {
      // Player2 is the joiner (player1 already joined at create-game time)
      // Override the seat in the action with the correct one
      actionToApply = { ...action, seat: 'player2' };
    } else {
      // For all other actions, verify the seat matches the action's seat field if present
      if ('seat' in action && (action as { seat?: Seat }).seat !== seat) {
        return new Response(JSON.stringify({ error: 'Seat mismatch' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Apply action via game reducer
    let newState: GameState;
    try {
      newState = gameReducer(currentState, actionToApply);
    } catch (err) {
      if (err instanceof GameError) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw err;
    }

    // After JOIN_GAME when both players are present, deal the hand
    if (
      action.type === 'JOIN_GAME' &&
      newState.phase === 'active' &&
      newState.currentHand?.phase === 'dealing'
    ) {
      newState = gameReducer(newState, { type: 'DEAL_HAND' });
    }

    const publicState = derivePublicState(newState);

    // Optimistic concurrency update
    const { data: updated, error: updateError } = await supabase
      .from('games')
      .update({
        phase: newState.phase,
        public_state: publicState,
        private_state: newState,
        version: newState.version,
      })
      .eq('id', gameId)
      .eq('version', currentVersion) // optimistic lock
      .select('id')
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updated) {
      // Another write won the race — return conflict so client retries
      return new Response(JSON.stringify({ ok: false, error: 'conflict', retry: true }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Broadcast private hands to each player's private Realtime channel
    const p1 = newState.players.player1;
    const p2 = newState.players.player2;

    const broadcastPromises: Promise<unknown>[] = [];

    if (p1) {
      broadcastPromises.push(
        supabase.realtime
          .channel(`game:${gameId}:player1:${p1.token}`)
          .send({
            type: 'broadcast',
            event: 'hand',
            payload: { hand: p1.hand },
          }),
      );
    }

    if (p2) {
      broadcastPromises.push(
        supabase.realtime
          .channel(`game:${gameId}:player2:${p2.token}`)
          .send({
            type: 'broadcast',
            event: 'hand',
            payload: { hand: p2.hand },
          }),
      );
    }

    await Promise.all(broadcastPromises);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('action error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
