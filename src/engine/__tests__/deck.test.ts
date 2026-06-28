import { describe, it, expect } from 'vitest';
import { buildDeck, shuffle, dealHands } from '../deck.ts';

describe('buildDeck', () => {
  it('produces exactly 40 cards', () => {
    expect(buildDeck()).toHaveLength(40);
  });

  it('contains no duplicates', () => {
    const deck = buildDeck();
    const ids = deck.map((c) => c.id);
    expect(new Set(ids).size).toBe(40);
  });

  it('contains exactly 4 manilhas', () => {
    const deck = buildDeck();
    const manilhas = deck.filter((c) => c.isManilha);
    expect(manilhas).toHaveLength(4);
    const manilhaIds = manilhas.map((c) => c.id).sort();
    expect(manilhaIds).toEqual(['4-clubs', '7-diamonds', '7-hearts', 'A-spades'].sort());
  });

  it('does not include 8s, 9s, or 10s', () => {
    const deck = buildDeck();
    const forbidden = deck.filter((c) =>
      ['8', '9', '10'].includes(c.rank),
    );
    expect(forbidden).toHaveLength(0);
  });

  it('has 10 cards per suit', () => {
    const deck = buildDeck();
    const suits = ['clubs', 'hearts', 'spades', 'diamonds'];
    for (const suit of suits) {
      expect(deck.filter((c) => c.suit === suit)).toHaveLength(10);
    }
  });
});

describe('shuffle', () => {
  it('returns a deck with the same cards in different order (statistically)', () => {
    const deck = buildDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).toHaveLength(40);
    expect(shuffled.map((c) => c.id).sort()).toEqual(deck.map((c) => c.id).sort());
    // With 40 cards it is astronomically unlikely that shuffle produces the same order
    expect(shuffled.map((c) => c.id).join(',')).not.toBe(deck.map((c) => c.id).join(','));
  });

  it('does not mutate the original array', () => {
    const deck = buildDeck();
    const originalFirst = deck[0].id;
    shuffle(deck);
    expect(deck[0].id).toBe(originalFirst);
  });
});

describe('dealHands', () => {
  it('deals 3 cards to each player', () => {
    const deck = shuffle(buildDeck());
    const { hand1, hand2 } = dealHands(deck);
    expect(hand1).toHaveLength(3);
    expect(hand2).toHaveLength(3);
  });

  it('deals disjoint hands', () => {
    const deck = shuffle(buildDeck());
    const { hand1, hand2 } = dealHands(deck);
    const ids1 = new Set(hand1.map((c) => c.id));
    for (const card of hand2) {
      expect(ids1.has(card.id)).toBe(false);
    }
  });
});
