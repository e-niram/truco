import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { canCallTruco } from '@/engine/betting';
import { ScoreBar } from './ScoreBar';
import { RoundIndicator } from './RoundIndicator';
import { PlayedCards } from './PlayedCards';
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
  const [toast, setToast] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const hand = publicState?.currentHand;
  const bet = hand?.bet;
  const isMyTurn = hand?.currentTurn === mySeat && hand?.phase === 'playing';
  const isBetting = hand?.phase === 'betting';
  const isHandOver = hand?.phase === 'handOver';
  const isMatchOver = publicState?.phase === 'finished' || hand?.phase === 'matchOver';

  const opponentSeat: Seat = mySeat === 'player1' ? 'player2' : 'player1';
  const opponentCardCount = publicState?.players[opponentSeat]?.cardCount ?? 0;

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

  // Auto-dismiss hand-over after 2 seconds
  useEffect(() => {
    if (isHandOver && !isMatchOver) {
      const t = setTimeout(() => {
        void doAction(() => actions.startNextHand());
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [isHandOver, isMatchOver]);

  if (!publicState) {
    return (
      <div style={centerStyle}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Carregando...</p>
      </div>
    );
  }

  if (publicState.phase === 'waiting') {
    return (
      <div style={centerStyle}>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
          Aguardando oponente...
        </p>
      </div>
    );
  }

  const canCallBet = mySeat && bet && canCallTruco(bet, mySeat) && hand?.phase === 'playing';

  return (
    <div style={boardStyle}>
      {/* Reconnecting banner */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={reconnectingStyle}
          >
            Reconectando...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score */}
      <div style={{ padding: '16px 0 8px' }}>
        <ScoreBar scores={publicState.score} mySeat={mySeat} />
      </div>

      {/* Opponent hand */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '24px' }}>
        <OpponentHand cardCount={opponentCardCount} />
      </div>

      {/* Center: round indicator + played cards */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        {hand && (
          <RoundIndicator
            tricks={hand.tricks}
            currentRound={(hand.tricks.length + 1) as 1 | 2 | 3}
            mySeat={mySeat}
          />
        )}
        {hand && <PlayedCards trick={hand.currentTrick} mySeat={mySeat} />}
      </div>

      {/* Actions row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', padding: '12px 0' }}>
        {canCallBet && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => doAction(() => actions.callTruco())}
            disabled={actionPending}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          >
            Truco!
          </Button>
        )}
      </div>

      {/* Player hand */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '40px' }}>
        <PlayerHand
          hand={myHand}
          isMyTurn={isMyTurn}
          onPlayCard={(cardId) => doAction(() => actions.playCard(cardId))}
        />
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

      {/* Hand over result */}
      <AnimatePresence>
        {isHandOver && !isMatchOver && hand && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={resultOverlayStyle}
          >
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              {hand.winner === mySeat
                ? 'Você ganhou a mão!'
                : hand.winner
                ? 'Oponente ganhou a mão'
                : 'Empate'}
            </p>
            <p style={{ fontSize: '26px', fontWeight: 700, marginTop: '4px' }}>
              +{hand.pointsAtStake} pts
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match over */}
      <Modal open={isMatchOver}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Fim de jogo</p>
          <p style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {publicState.score.player1 >= 12
              ? mySeat === 'player1' ? '🏆 Você ganhou!' : 'Oponente ganhou'
              : mySeat === 'player2' ? '🏆 Você ganhou!' : 'Oponente ganhou'}
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
            {publicState.score.player1} × {publicState.score.player2}
          </p>
          <Button onClick={() => window.location.reload()}>Jogar de novo</Button>
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
  position: 'relative',
  overflow: 'hidden',
  maxWidth: '480px',
  margin: '0 auto',
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
  background: 'rgba(0,0,0,0.6)',
  borderRadius: '100px',
  padding: '4px 12px',
  zIndex: 50,
};

const resultOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: '16px',
  padding: '20px 28px',
  textAlign: 'center',
  pointerEvents: 'none',
  zIndex: 20,
};
