import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { GameState } from './engine/types.ts';
import { gameReducer, derivePublicState } from './engine/gameReducer.ts';

export async function createGameForPlayer1(
  supabase: ReturnType<typeof createClient>,
  playerToken: string,
): Promise<{ gameId: string; newState: GameState }> {
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

  return { gameId, newState };
}
