import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { GameState } from '../_shared/engine/types.ts';
import { gameReducer, derivePublicState } from '../_shared/engine/gameReducer.ts';

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
    const { playerToken } = await req.json() as { playerToken: string };
    if (!playerToken || typeof playerToken !== 'string') {
      return new Response(JSON.stringify({ error: 'playerToken required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Insert a new game row; get the generated UUID
    const { data: row, error: insertError } = await supabase
      .from('games')
      .insert({ phase: 'waiting', public_state: {}, private_state: {}, version: 0 })
      .select('id')
      .single();

    if (insertError || !row) {
      throw insertError ?? new Error('Insert returned no row');
    }

    const gameId: string = row.id;

    // Apply JOIN_GAME for player1
    const initialState: GameState = {
      gameId,
      phase: 'waiting',
      players: { player1: null, player2: null },
      score: { player1: 0, player2: 0 },
      currentHand: null,
      handHistory: [],
      version: 0,
    };

    const newState = gameReducer(initialState, {
      type: 'JOIN_GAME',
      seat: 'player1',
      token: playerToken,
    });

    const publicState = derivePublicState(newState);

    const { error: updateError } = await supabase
      .from('games')
      .update({
        phase: newState.phase,
        public_state: publicState,
        private_state: newState,
        version: newState.version,
      })
      .eq('id', gameId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ gameId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-game error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
