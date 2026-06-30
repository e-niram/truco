import type { BetLevel } from '@/engine/types';

export const BET_SEQUENCE: BetLevel[] = [2, 4, 6, 10, 12];

export const BET_LABELS: Record<BetLevel, string> = {
  2: 'Truco',
  4: 'Seis',
  6: 'Dez',
  10: 'Doze',
  12: 'Doze',
};

export const SUIT_SYMBOL: Record<string, string> = {
  clubs: '♣',
  hearts: '♥',
  spades: '♠',
  diamonds: '♦',
};

export const SUIT_COLOR: Record<string, string> = {
  clubs: '#1a1a1a',
  hearts: '#cc2222',
  spades: '#1a1a1a',
  diamonds: '#cc2222',
};
