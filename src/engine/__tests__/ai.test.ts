import { describe, it, expect } from 'vitest';
import { estimateHandStrength, chooseCardToPlay, shouldCallTruco, decideBetResponse } from '../ai.ts';
import { initialBetState, applyCallTruco } from '../betting.ts';
import { buildCardId, cardStrength, isManilha } from '../ranking.ts';
import type { Card, Trick } from '../types.ts';

function card(rank: Card['rank'], suit: Card['suit']): Card {
  return {
    rank,
    suit,
    id: buildCardId(rank, suit),
    isManilha: isManilha(rank, suit),
    strength: cardStrength(rank, suit),
  };
}

function emptyTrick(): Trick {
  return { roundNumber: 1, player1Card: null, player2Card: null, winner: null };
}

describe('estimateHandStrength', () => {
  it('rates a low, manilha-free hand as weak', () => {
    const hand = [card('4', 'hearts'), card('5', 'hearts'), card('6', 'spades')];
    expect(estimateHandStrength(hand)).toBe('weak');
  });

  it('rates a hand with two manilhas as strong', () => {
    const hand = [card('4', 'clubs'), card('7', 'hearts'), card('3', 'clubs')];
    expect(estimateHandStrength(hand)).toBe('strong');
  });
});

describe('shouldCallTruco', () => {
  it('does not call truco on a weak hand', () => {
    const hand = [card('4', 'hearts'), card('5', 'hearts'), card('6', 'spades')];
    expect(shouldCallTruco(hand)).toBe(false);
  });

  it('calls truco on a strong hand', () => {
    const hand = [card('4', 'clubs'), card('7', 'hearts'), card('3', 'clubs')];
    expect(shouldCallTruco(hand)).toBe(true);
  });
});

describe('chooseCardToPlay', () => {
  it('when leading, avoids playing a manilha if a non-manilha is available', () => {
    const hand = [card('4', 'clubs'), card('5', 'hearts'), card('6', 'spades')];
    const chosen = chooseCardToPlay(hand, emptyTrick(), 'player2');
    expect(chosen.isManilha).toBe(false);
  });

  it('when following, plays the cheapest card that still wins', () => {
    const hand = [card('3', 'hearts'), card('6', 'spades'), card('5', 'diamonds')];
    const trick: Trick = { roundNumber: 1, player1Card: card('K', 'clubs'), player2Card: null, winner: null };
    const chosen = chooseCardToPlay(hand, trick, 'player2');
    expect(chosen.id).toBe(card('3', 'hearts').id);
  });

  it('when following and no card can win, plays the weakest card', () => {
    const hand = [card('4', 'hearts'), card('5', 'diamonds'), card('6', 'spades')];
    const trick: Trick = { roundNumber: 1, player1Card: card('3', 'clubs'), player2Card: null, winner: null };
    const chosen = chooseCardToPlay(hand, trick, 'player2');
    expect(chosen.id).toBe(card('4', 'hearts').id);
  });
});

describe('decideBetResponse', () => {
  it('rejects a truco call on a weak hand', () => {
    const hand = [card('4', 'hearts'), card('5', 'diamonds'), card('6', 'spades')];
    const bet = applyCallTruco(initialBetState(), 'player1');
    expect(decideBetResponse(hand, bet, 'player2')).toBe('reject');
  });

  it('accepts on a medium hand', () => {
    const hand = [card('3', 'hearts'), card('K', 'spades'), card('6', 'diamonds')];
    const bet = applyCallTruco(initialBetState(), 'player1');
    expect(decideBetResponse(hand, bet, 'player2')).toBe('accept');
  });

  it('raises on a strong hand when raising is possible', () => {
    const hand = [card('4', 'clubs'), card('7', 'hearts'), card('3', 'clubs')];
    const bet = applyCallTruco(initialBetState(), 'player1');
    expect(decideBetResponse(hand, bet, 'player2')).toBe('raise');
  });
});
