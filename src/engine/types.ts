export type Suit = 'clubs' | 'hearts' | 'spades' | 'diamonds';

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | 'J' | 'Q' | 'K';

export type Seat = 'player1' | 'player2';

export type BetLevel = 2 | 4 | 6 | 10 | 12;

export type HandPhase = 'dealing' | 'playing' | 'betting' | 'handOver' | 'matchOver';

export type GamePhase = 'waiting' | 'active' | 'finished';

export interface Card {
  rank: Rank;
  suit: Suit;
  id: string;
  isManilha: boolean;
  strength: number;
}

export interface Trick {
  roundNumber: 1 | 2 | 3;
  player1Card: Card | null;
  player2Card: Card | null;
  winner: Seat | 'tie' | null;
}

export type BetStatus = 'none' | 'pending' | 'accepted' | 'rejected';

export interface BetState {
  currentLevel: BetLevel;
  pendingLevel: BetLevel | null;
  calledBy: Seat | null;
  status: BetStatus;
}

export interface Player {
  seat: Seat;
  token: string;
  hand: Card[];
  isConnected: boolean;
}

export interface Hand {
  handNumber: number;
  tricks: Trick[];
  currentTrick: Trick;
  currentTurn: Seat;
  firstTurnOfHand: Seat;
  phase: HandPhase;
  bet: BetState;
  winner: Seat | null;
  pointsAtStake: BetLevel;
}

export interface GameState {
  gameId: string;
  phase: GamePhase;
  players: {
    player1: Player | null;
    player2: Player | null;
  };
  score: {
    player1: number;
    player2: number;
  };
  currentHand: Hand | null;
  handHistory: Hand[];
  version: number;
}

// What gets broadcast publicly — no hands included
export interface PublicPlayer {
  seat: Seat;
  isConnected: boolean;
  cardCount: number;
}

export interface PublicGameState {
  gameId: string;
  phase: GamePhase;
  players: {
    player1: PublicPlayer | null;
    player2: PublicPlayer | null;
  };
  score: {
    player1: number;
    player2: number;
  };
  currentHand: Omit<Hand, never> | null;
  version: number;
}

export type GameAction =
  | { type: 'JOIN_GAME'; seat: Seat; token: string }
  | { type: 'DEAL_HAND' }
  | { type: 'PLAY_CARD'; seat: Seat; cardId: string }
  | { type: 'CALL_TRUCO'; seat: Seat }
  | { type: 'RAISE_BET'; seat: Seat }
  | { type: 'ACCEPT_BET'; seat: Seat }
  | { type: 'REJECT_BET'; seat: Seat }
  | { type: 'START_NEXT_HAND' }
  | { type: 'RECONNECT'; seat: Seat; token: string };
