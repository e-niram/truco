import { v4 as uuidv4 } from 'uuid';
import type { Seat } from '@/engine/types';

const TOKEN_KEY = 'trucomineiro_player_token';

export function getOrCreateToken(): string {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = uuidv4();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function resolveSeat(
  tokens: { player1Token?: string; player2Token?: string },
  myToken: string,
): Seat | null {
  if (tokens.player1Token === myToken) return 'player1';
  if (tokens.player2Token === myToken) return 'player2';
  return null;
}
