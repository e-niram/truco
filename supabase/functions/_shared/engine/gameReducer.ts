import type {
  GameState,
  GameAction,
  Hand,
  Trick,
  Seat,
  PublicGameState,
  PublicPlayer,
} from './types.ts';
import { buildDeck, shuffle, dealHands } from './deck.ts';
import { resolveRound, resolveHand } from './ranking.ts';
import {
  initialBetState,
  applyCallTruco,
  applyRaiseBet,
  applyAcceptBet,
  applyRejectBet,
  canCallTruco,
  canRaiseBet,
} from './betting.ts';

export class GameError extends Error {}

function opponent(seat: Seat): Seat {
  return seat === 'player1' ? 'player2' : 'player1';
}

function emptyTrick(roundNumber: 1 | 2 | 3): Trick {
  return { roundNumber, player1Card: null, player2Card: null, winner: null };
}

function newHand(handNumber: number, firstTurn: Seat): Hand {
  return {
    handNumber,
    tricks: [],
    currentTrick: emptyTrick(1),
    currentTurn: firstTurn,
    firstTurnOfHand: firstTurn,
    phase: 'dealing',
    bet: initialBetState(),
    winner: null,
    pointsAtStake: 2,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'JOIN_GAME': {
      const { seat, token } = action;
      if (state.players[seat]) {
        throw new GameError(`Seat ${seat} already taken`);
      }
      const newPlayers = {
        ...state.players,
        [seat]: { seat, token, hand: [], isConnected: true },
      };
      const bothJoined = newPlayers.player1 && newPlayers.player2;
      return {
        ...state,
        players: newPlayers,
        phase: bothJoined ? 'active' : 'waiting',
        currentHand: bothJoined
          ? newHand(1, 'player1')
          : state.currentHand,
        version: state.version + 1,
      };
    }

    case 'DEAL_HAND': {
      if (!state.currentHand) throw new GameError('No current hand');
      if (state.currentHand.phase !== 'dealing') {
        throw new GameError('Not in dealing phase');
      }
      const deck = shuffle(buildDeck());
      const { hand1, hand2 } = dealHands(deck);
      return {
        ...state,
        players: {
          player1: state.players.player1
            ? { ...state.players.player1, hand: hand1 }
            : null,
          player2: state.players.player2
            ? { ...state.players.player2, hand: hand2 }
            : null,
        },
        currentHand: { ...state.currentHand, phase: 'playing' },
        version: state.version + 1,
      };
    }

    case 'PLAY_CARD': {
      const { seat, cardId } = action;
      const hand = state.currentHand;
      if (!hand) throw new GameError('No active hand');
      if (hand.phase !== 'playing') throw new GameError('Not in playing phase');
      if (hand.currentTurn !== seat) throw new GameError('Not your turn');

      const player = state.players[seat];
      if (!player) throw new GameError('Player not found');

      const cardIndex = player.hand.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) throw new GameError('Card not in hand');

      const card = player.hand[cardIndex];
      const newPlayerHand = player.hand.filter((_, i) => i !== cardIndex);

      const newTrick: Trick = {
        ...hand.currentTrick,
        ...(seat === 'player1'
          ? { player1Card: card }
          : { player2Card: card }),
      };

      const trickComplete =
        newTrick.player1Card !== null && newTrick.player2Card !== null;

      let updatedTrick = newTrick;
      let updatedHand = hand;
      let updatedScore = state.score;
      let newPhase = state.phase;

      if (trickComplete) {
        const roundWinner = resolveRound(newTrick);
        updatedTrick = { ...newTrick, winner: roundWinner };
        const completedTricks = [...hand.tricks, updatedTrick];

        const { winner: handWinner, isDraw } = resolveHand(completedTricks);

        if (handWinner || isDraw) {
          // Hand is over
          const pointsToAward = isDraw ? 0 : hand.pointsAtStake;
          if (handWinner) {
            updatedScore = {
              ...state.score,
              [handWinner]: state.score[handWinner] + pointsToAward,
            };
          }

          const matchOver =
            updatedScore.player1 >= 12 || updatedScore.player2 >= 12;

          updatedHand = {
            ...hand,
            tricks: completedTricks,
            currentTrick: updatedTrick,
            phase: matchOver ? 'matchOver' : 'handOver',
            winner: handWinner,
            pointsAtStake: hand.pointsAtStake,
          };

          if (matchOver) newPhase = 'finished';
        } else {
          // More tricks to play — next turn goes to round winner (or same first turn on tie)
          const nextTurn =
            roundWinner === 'tie'
              ? hand.firstTurnOfHand
              : (roundWinner as Seat);
          const nextRound = (completedTricks.length + 1) as 1 | 2 | 3;
          updatedHand = {
            ...hand,
            tricks: completedTricks,
            currentTrick: emptyTrick(nextRound),
            currentTurn: nextTurn,
            phase: 'playing',
          };
        }
      } else {
        // Trick not yet complete — switch turn to other player
        updatedHand = {
          ...hand,
          currentTrick: updatedTrick,
          currentTurn: opponent(seat),
        };
      }

      return {
        ...state,
        phase: newPhase,
        score: updatedScore,
        players: {
          ...state.players,
          [seat]: { ...player, hand: newPlayerHand },
        },
        currentHand: updatedHand,
        version: state.version + 1,
      };
    }

    case 'CALL_TRUCO': {
      const { seat } = action;
      const hand = state.currentHand;
      if (!hand) throw new GameError('No active hand');
      if (hand.phase !== 'playing') throw new GameError('Not in playing phase');
      if (!canCallTruco(hand.bet, seat)) throw new GameError('Cannot call truco now');

      const newBet = applyCallTruco(hand.bet, seat);
      return {
        ...state,
        currentHand: { ...hand, bet: newBet, phase: 'betting' },
        version: state.version + 1,
      };
    }

    case 'RAISE_BET': {
      const { seat } = action;
      const hand = state.currentHand;
      if (!hand) throw new GameError('No active hand');
      if (hand.phase !== 'betting') throw new GameError('No pending bet');
      if (!canRaiseBet(hand.bet, seat)) throw new GameError('Cannot raise now');

      const newBet = applyRaiseBet(hand.bet, seat);
      return {
        ...state,
        currentHand: { ...hand, bet: newBet },
        version: state.version + 1,
      };
    }

    case 'ACCEPT_BET': {
      const { seat } = action;
      const hand = state.currentHand;
      if (!hand) throw new GameError('No active hand');
      if (hand.phase !== 'betting') throw new GameError('No pending bet');
      if (hand.bet.calledBy === seat) throw new GameError('Cannot accept your own bet');

      const newBet = applyAcceptBet(hand.bet);
      return {
        ...state,
        currentHand: {
          ...hand,
          bet: newBet,
          pointsAtStake: newBet.currentLevel,
          phase: 'playing',
        },
        version: state.version + 1,
      };
    }

    case 'REJECT_BET': {
      const { seat } = action;
      const hand = state.currentHand;
      if (!hand) throw new GameError('No active hand');
      if (hand.phase !== 'betting') throw new GameError('No pending bet');
      if (hand.bet.calledBy === seat) throw new GameError('Cannot reject your own bet');

      // Rejecting means the rejector's team loses the current (pre-raise) hand value
      const callerSeat = hand.bet.calledBy!;
      const pointsAwarded = hand.bet.currentLevel;
      const newBet = applyRejectBet(hand.bet);
      const newScore = {
        ...state.score,
        [callerSeat]: state.score[callerSeat] + pointsAwarded,
      };
      const matchOver = newScore.player1 >= 12 || newScore.player2 >= 12;

      return {
        ...state,
        phase: matchOver ? 'finished' : state.phase,
        score: newScore,
        currentHand: {
          ...hand,
          bet: newBet,
          phase: matchOver ? 'matchOver' : 'handOver',
          winner: callerSeat,
          pointsAtStake: pointsAwarded,
        },
        version: state.version + 1,
      };
    }

    case 'START_NEXT_HAND': {
      const hand = state.currentHand;
      if (!hand) throw new GameError('No current hand');
      if (hand.phase !== 'handOver') throw new GameError('Hand not over yet');

      // Loser of last hand goes first; on draw, alternate
      const nextFirst = hand.winner ? opponent(hand.winner) : opponent(hand.firstTurnOfHand);
      const nextHandNumber = hand.handNumber + 1;

      return {
        ...state,
        currentHand: newHand(nextHandNumber, nextFirst),
        handHistory: [...state.handHistory, hand],
        version: state.version + 1,
      };
    }

    case 'RECONNECT': {
      const { seat, token } = action;
      const player = state.players[seat];
      if (!player || player.token !== token) {
        throw new GameError('Invalid token');
      }
      return {
        ...state,
        players: {
          ...state.players,
          [seat]: { ...player, isConnected: true },
        },
        version: state.version + 1,
      };
    }

    default: {
      const _exhaustive: never = action;
      throw new GameError(`Unknown action: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function derivePublicState(state: GameState): PublicGameState {
  function toPublicPlayer(seat: Seat): PublicPlayer | null {
    const p = state.players[seat];
    if (!p) return null;
    return { seat: p.seat, isConnected: p.isConnected, cardCount: p.hand.length };
  }

  // Strip hand data from current trick's played cards — those ARE public (face-up)
  // Only unplayed hands are private.
  return {
    gameId: state.gameId,
    phase: state.phase,
    players: {
      player1: toPublicPlayer('player1'),
      player2: toPublicPlayer('player2'),
    },
    score: state.score,
    currentHand: state.currentHand,
    version: state.version,
  };
}
