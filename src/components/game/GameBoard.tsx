import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useGameActions, createGame } from '@/hooks/useGameActions';
import { canCallTruco } from '@/engine/betting';
import { useLanguage } from '@/lib/LanguageContext';
import { TopBar } from './TopBar';
import { Card } from '@/components/cards/Card';
import { PlayerHand } from './PlayerHand';
import { OpponentHand } from './OpponentHand';
import { BettingPanel } from './BettingPanel';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import type { Seat, Trick } from '@/engine/types';

interface GameBoardProps {
  gameId: string;
  token: string;
}

export function GameBoard({ gameId, token }: GameBoardProps) {
  const { publicState, myHand, mySeat, isConnected } = useGameStore();
  const actions = useGameActions(gameId, token, mySeat);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);

  // Freeze the last completed trick for 3 seconds to show the winner highlight.
  // We watch hand.tricks.length rather than currentTrick.winner because the reducer
  // resolves trick winner and resets currentTrick atomically in one state update —
  // the client never sees an intermediate currentTrick with winner set (except for
  // the last trick of a hand). hand.tricks always receives the completed trick first.
  const completedTrickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTricksLengthRef = useRef(0);
  const [completedTrick, setCompletedTrick] = useState<Trick | null>(null);

  const hand = publicState?.currentHand;
  const bet = hand?.bet;
  const isMyTurn = hand?.currentTurn === mySeat && hand?.phase === 'playing';
  const isBetting = hand?.phase === 'betting';
  const isHandOver = hand?.phase === 'handOver';
  const isMatchOver = publicState?.phase === 'finished' || hand?.phase === 'matchOver';
  const canCallBet = Boolean(mySeat && bet && canCallTruco(bet, mySeat) && hand?.phase === 'playing');

  const opponentSeat: Seat = mySeat === 'player1' ? 'player2' : 'player1';
  const opponentCardCount = publicState?.players[opponentSeat]?.cardCount ?? 0;

  const currentTrick = hand?.currentTrick;

  // Reset ref and any active freeze when a new hand starts
  useEffect(() => {
    prevTricksLengthRef.current = 0;
    setCompletedTrick(null);
    if (completedTrickTimer.current) {
      clearTimeout(completedTrickTimer.current);
      completedTrickTimer.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hand?.handNumber]);

  // Freeze when hand.tricks grows — this fires for every completed trick reliably
  useEffect(() => {
    const tricks = hand?.tricks ?? [];
    const len = tricks.length;
    if (len <= prevTricksLengthRef.current) return;
    prevTricksLengthRef.current = len;

    const lastTrick = tricks[len - 1];
    if (!lastTrick) return;

    setCompletedTrick(lastTrick);
    if (completedTrickTimer.current) clearTimeout(completedTrickTimer.current);
    completedTrickTimer.current = setTimeout(() => {
      setCompletedTrick(null);
      completedTrickTimer.current = null;
    }, 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hand?.tricks.length]);

  // Clear freeze early once a card appears in the next trick
  useEffect(() => {
    if (!completedTrick || currentTrick?.winner) return;
    if (currentTrick?.player1Card || currentTrick?.player2Card) {
      setCompletedTrick(null);
      if (completedTrickTimer.current) {
        clearTimeout(completedTrickTimer.current);
        completedTrickTimer.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrick?.player1Card?.id, currentTrick?.player2Card?.id]);

  // Use the frozen trick for display if active, otherwise current
  const displayTrick = completedTrick ?? currentTrick;
  const myPlayedCard = mySeat === 'player1' ? displayTrick?.player1Card : displayTrick?.player2Card;
  const theirPlayedCard = mySeat === 'player1' ? displayTrick?.player2Card : displayTrick?.player1Card;

  // Highlight state — only active while the freeze is showing
  const trickWinner = completedTrick?.winner ?? null;
  const myCardWon = Boolean(trickWinner && trickWinner !== 'tie' && trickWinner === mySeat);
  const theirCardWon = Boolean(trickWinner && trickWinner !== 'tie' && trickWinner !== mySeat);
  const isTrickTie = trickWinner === 'tie';

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function doAction(fn: () => Promise<unknown>, successMsg?: string) {
    if (actionPending) return;
    setActionPending(true);
    try {
      await fn();
      if (successMsg) showToast(successMsg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro';
      showToast(msg);
    } finally {
      setActionPending(false);
    }
  }

  useEffect(() => {
    if (isHandOver && !isMatchOver) {
      const t = setTimeout(() => {
        void doAction(() => actions.startNextHand());
      }, 2200);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHandOver, isMatchOver]);

  if (!publicState) {
    return (
      <div style={centerStyle}>
        <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: '14px' }}>{t('loading')}</p>
      </div>
    );
  }

  if (publicState.phase === 'waiting') {
    return (
      <div style={centerStyle}>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.62)' }}>{t('waitingOpponent')}</p>
      </div>
    );
  }

  return (
    <div style={boardStyle}>
      {/* Top bar: scores + round */}
      <TopBar
        scores={publicState.score}
        mySeat={mySeat}
        currentTurn={hand?.currentTurn ?? null}
        tricks={hand?.tricks ?? []}
        currentRound={hand ? ((hand.tricks.length + 1) as 1 | 2 | 3) : 1}
        pointsAtStake={hand?.pointsAtStake ?? 2}
      />

      {/* Main play area — flat anchor+spacer layout */}
      <div style={mainAreaStyle}>
        <AnimatePresence>
          {!isConnected && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={reconnectingStyle}
            >
              {t('reconnecting')}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Opponent hand — anchored to top. paddingTop ≥ card height so the
            180-deg-rotated cards (which extend upward from their natural box)
            don't get clipped by the container's overflow:hidden.
            marginBottom: -104px cancels the card's natural layout box (which
            extends downward even though the visual is above), so the flex
            spacers treat this section as 112px tall — matching the visual
            card bottom — and the divider floats to the true midpoint. */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '112px', flexShrink: 0, marginBottom: '-104px' }}>
          <OpponentHand cardCount={opponentCardCount} />
        </div>

        {/* Upper table spacer — doubles as hand result display */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '12px' }}>
          <AnimatePresence>
            {isHandOver && !isMatchOver && hand && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 6 }}
                style={resultOverlayStyle}
              >
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.62)' }}>
                  {hand.winner === mySeat
                    ? t('youWonHand')
                    : hand.winner
                    ? t('opponentWonHand')
                    : t('tie')}
                </p>
                <p style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px' }}>
                  +{hand.pointsAtStake} pts
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center section: 3-column row — spacer | played cards + divider | Truco button */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>

          {/* Left balance spacer (mirrors Truco column width) */}
          <div style={{ width: '68px', flexShrink: 0 }} />

          {/* Cards column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ paddingBottom: '10px' }}>
              {hand && (theirPlayedCard
                ? <div style={cardHighlight(theirCardWon, myCardWon, isTrickTie)}>
                    <Card card={theirPlayedCard} layoutId={`played-${theirPlayedCard.id}`} />
                  </div>
                : <PlayedSlot />
              )}
            </div>
            <div style={{ alignSelf: 'stretch', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 8px' }} />
            <div style={{ paddingTop: '10px' }}>
              {hand && (myPlayedCard
                ? <div style={cardHighlight(myCardWon, theirCardWon, isTrickTie)}>
                    <Card card={myPlayedCard} layoutId={`played-${myPlayedCard.id}`} />
                  </div>
                : <PlayedSlot />
              )}
            </div>
          </div>

          {/* Right: Truco square button — always in layout, hidden when unavailable */}
          <div style={{ width: '68px', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button
              onClick={() => doAction(() => actions.callTruco())}
              disabled={actionPending || !canCallBet}
              style={trucoBtnStyle(actionPending, canCallBet)}
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>✊</span>
              <span style={{ display: 'block', fontSize: '8px', fontWeight: 800, letterSpacing: '0.1em', marginTop: '4px', lineHeight: 1 }}>TRUCO</span>
            </button>
          </div>

        </div>

        {/* Lower table spacer */}
        <div style={{ flex: 1 }} />

        {/* Player hand — anchored to bottom */}
        <div style={{ paddingBottom: '32px', width: '100%', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PlayerHand
              hand={myHand}
              isMyTurn={isMyTurn}
              onPlayCard={(cardId) => doAction(() => actions.playCard(cardId))}
            />
          </div>
        </div>
      </div>

      {/* Betting overlay */}
      {isBetting && bet && (
        <BettingPanel
          bet={bet}
          mySeat={mySeat}
          onAccept={() => doAction(() => actions.acceptBet())}
          onRaise={() => doAction(() => actions.raiseBet())}
          onReject={() => doAction(() => actions.rejectBet())}
        />
      )}

      {/* Match over */}
      <Modal open={isMatchOver}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.62)' }}>{t('gameOver')}</p>
          <p style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {publicState.score.player1 >= 12
              ? mySeat === 'player1' ? t('youWon') : t('opponentWon')
              : mySeat === 'player2' ? t('youWon') : t('opponentWon')}
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.62)' }}>
            {publicState.score.player1} × {publicState.score.player2}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Button
              onClick={async () => {
                if (creatingGame) return;
                setCreatingGame(true);
                try {
                  const newId = await createGame(token);
                  navigate(`/game/${newId}`);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : 'Erro';
                  showToast(msg);
                  setCreatingGame(false);
                }
              }}
              disabled={creatingGame}
            >
              {t('playAgain')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/')}>
              {t('backToStart')}
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}

const boardStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--color-table)',
  overflow: 'hidden',
  maxWidth: '480px',
  margin: '0 auto',
};

const mainAreaStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
};

const centerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const reconnectingStyle: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  left: '50%',
  transform: 'translateX(-50%)',
  fontSize: '12px',
  color: 'rgba(255,255,255,0.5)',
  background: 'rgba(0,0,0,0.65)',
  borderRadius: '100px',
  padding: '4px 14px',
  zIndex: 50,
  whiteSpace: 'nowrap',
};

function PlayedSlot() {
  return (
    <div
      style={{
        width: 'var(--card-width)',
        height: 'var(--card-height)',
        borderRadius: 'var(--card-radius)',
        border: '1.5px dashed rgba(255,255,255,0.18)',
      }}
    />
  );
}

function cardHighlight(isWinner: boolean, isLoser: boolean, isTie: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 'var(--card-radius)',
    transition: 'box-shadow 250ms ease, opacity 250ms ease',
  };
  if (isTie) {
    return { ...base, boxShadow: '0 0 0 2px rgba(255,255,255,0.55), 0 0 16px rgba(255,255,255,0.18)' };
  }
  if (isWinner) {
    return { ...base, boxShadow: '0 0 0 2.5px #34D399, 0 0 20px rgba(52,211,153,0.4)' };
  }
  if (isLoser) {
    return { ...base, opacity: 0.35 };
  }
  return base;
}

function trucoBtnStyle(pending: boolean, visible: boolean): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '56px',
    padding: 0,
    background: 'rgba(249,115,22,0.1)',
    color: 'var(--color-accent)',
    border: '1.5px solid rgba(249,115,22,0.4)',
    borderRadius: '12px',
    cursor: pending ? 'not-allowed' : 'pointer',
    opacity: pending ? 0.55 : 1,
    transition: 'opacity 150ms ease, box-shadow 150ms ease',
    boxShadow: '0 0 12px rgba(249,115,22,0.12)',
    visibility: visible ? 'visible' : 'hidden',
  };
}

const resultOverlayStyle: React.CSSProperties = {
  background: 'rgba(8,14,26,0.82)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderRadius: '18px',
  padding: '22px 32px',
  textAlign: 'center',
  border: '1px solid rgba(255,255,255,0.07)',
};
