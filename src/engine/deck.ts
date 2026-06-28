import type { Card, Rank, Suit } from './types.ts';
import { isManilha, cardStrength, buildCardId } from './ranking.ts';

const SUITS: Suit[] = ['clubs', 'hearts', 'spades', 'diamonds'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', 'J', 'Q', 'K'];

export function buildDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        rank,
        suit,
        id: buildCardId(rank, suit),
        isManilha: isManilha(rank, suit),
        strength: cardStrength(rank, suit),
      });
    }
  }
  return cards; // 40 cards
}

export function shuffle(cards: Card[]): Card[] {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function dealHands(deck: Card[]): { hand1: Card[]; hand2: Card[] } {
  // Standard deal: alternate 3 cards each
  return {
    hand1: deck.slice(0, 3),
    hand2: deck.slice(3, 6),
  };
}
