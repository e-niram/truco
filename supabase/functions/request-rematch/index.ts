import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { GameState } from '../_shared/engine/types.ts';
import { createGameForPlayer1 } from '../_shared/createGame.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { gameId, token } = await req.json() as { gameId: string; token: string };
    if (!gameId || !token) {
      return new Response(JSON.stringify({ error: 'gameId and token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: row, error: fetchError } = await supabase
      .from('games')
      .select('phase, private_state, rematch_game_id')
      .eq('id', gameId)
      .single();

    if (fetchError || !row) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (row.phase !== 'finished') {
      return new Response(JSON.stringify({ error: 'Game not finished' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const oldState = row.private_state as GameState;
    const isKnownPlayer =
      oldState.players.player1?.token === token || oldState.players.player2?.token === token;
    if (!isKnownPlayer) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Second clicker: the first clicker already created and linked the rematch game.
    if (row.rematch_game_id) {
      return new Response(JSON.stringify({ gameId: row.rematch_game_id }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // First clicker: create the rematch game and try to claim the link.
    const { gameId: newGameId } = await createGameForPlayer1(supabase, token);

    const { data: claimed, error: claimError } = await supabase
      .from('games')
      .update({ rematch_game_id: newGameId })
      .eq('id', gameId)
      .is('rematch_game_id', null)
      .select('id')
      .maybeSingle();

    if (claimError) throw claimError;

    if (claimed) {
      return new Response(JSON.stringify({ gameId: newGameId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lost the race to a concurrent request — converge on the winner's game instead.
    const { data: winnerRow, error: refetchError } = await supabase
      .from('games')
      .select('rematch_game_id')
      .eq('id', gameId)
      .single();

    if (refetchError || !winnerRow?.rematch_game_id) throw refetchError ?? new Error('Rematch link missing');

    return new Response(JSON.stringify({ gameId: winnerRow.rematch_game_id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('request-rematch error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
