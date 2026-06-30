import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
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
import type { Seat } from '@/engine/types';

interface GameBoardProps {
  gameId: string;
  token: string;
}

export function GameBoard({ gameId, token }: GameBoardProps) {
  const { publicState, myHand, mySeat, isConnected } = useGameStore();
  const actions = useGameActions(gameId, token, mySeat);
  const { t } = useLanguage();
  const [toast, setToast] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

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
  const myPlayedCard = mySeat === 'player1' ? currentTrick?.player1Card : currentTrick?.player2Card;
  const theirPlayedCard = mySeat === 'player1' ? currentTrick?.player2Card : currentTrick?.player1Card;

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

        {/* Upper table spacer */}
        <div style={{ flex: 1 }} />

        {/* Center section: 3-column row — spacer | played cards + divider | Truco button */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>

          {/* Left balance spacer (mirrors Truco column width) */}
          <div style={{ width: '68px', flexShrink: 0 }} />

          {/* Cards column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ paddingBottom: '10px' }}>
              {hand && (theirPlayedCard
                ? <Card card={theirPlayedCard} layoutId={`played-${theirPlayedCard.id}`} />
                : <PlayedSlot />
              )}
            </div>
            <div style={{ alignSelf: 'stretch', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 8px' }} />
            <div style={{ paddingTop: '10px' }}>
              {hand && (myPlayedCard
                ? <Card card={myPlayedCard} layoutId={`played-${myPlayedCard.id}`} />
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

      {/* Hand result overlay */}
      <AnimatePresence>
        {isHandOver && !isMatchOver && hand && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
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
          <Button onClick={() => window.location.reload()}>{t('playAgain')}</Button>
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
        border: '1.5px dashed rgba(255,255,255,0.09)',
      }}
    />
  );
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
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(8,14,26,0.82)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderRadius: '18px',
  padding: '22px 32px',
  textAlign: 'center',
  pointerEvents: 'none',
  zIndex: 20,
  border: '1px solid rgba(255,255,255,0.07)',
};
