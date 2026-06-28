import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { canCallTruco } from '@/engine/betting';
import { Sidebar } from './Sidebar';
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
  const canCallBet = Boolean(mySeat && bet && canCallTruco(bet, mySeat) && hand?.phase === 'playing');

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
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Carregando...</p>
      </div>
    );
  }

  if (publicState.phase === 'waiting') {
    return (
      <div style={centerStyle}>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
          Aguardando oponente...
        </p>
      </div>
    );
  }

  return (
    <div style={boardStyle}>
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

      {/* Main play area */}
      <div style={mainAreaStyle}>
        {/* Opponent hand */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '28px' }}>
          <OpponentHand cardCount={opponentCardCount} />
        </div>

        {/* Played cards center */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {hand && <PlayedCards trick={hand.currentTrick} mySeat={mySeat} />}
        </div>

        {/* Player hand */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '36px' }}>
          <PlayerHand
            hand={myHand}
            isMyTurn={isMyTurn}
            onPlayCard={(cardId) => doAction(() => actions.playCard(cardId))}
          />
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar
        scores={publicState.score}
        mySeat={mySeat}
        currentTurn={hand?.currentTurn ?? null}
        tricks={hand?.tricks ?? []}
        currentRound={hand ? ((hand.tricks.length + 1) as 1 | 2 | 3) : 1}
        canCallTruco={canCallBet}
        onCallTruco={() => doAction(() => actions.callTruco())}
        actionPending={actionPending}
      />

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
            <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
              {hand.winner === mySeat
                ? 'Você ganhou a mão!'
                : hand.winner
                ? 'Oponente ganhou a mão'
                : 'Empate'}
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
          <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Fim de jogo</p>
          <p style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {publicState.score.player1 >= 12
              ? mySeat === 'player1' ? 'Você ganhou!' : 'Oponente ganhou'
              : mySeat === 'player2' ? 'Você ganhou!' : 'Oponente ganhou'}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
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
  flexDirection: 'row',
  background: 'var(--color-table)',
  position: 'relative',
  overflow: 'hidden',
  maxWidth: '480px',
  margin: '0 auto',
};

const mainAreaStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  overflow: 'hidden',
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
  top: '10px',
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
