import type { BetState, Seat } from '@/engine/types';
import { canRaiseBet } from '@/engine/betting';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

const BET_NAMES: Record<number, string> = {
  4: 'Truco',
  6: 'Seis',
  10: 'Dez',
  12: 'Doze',
};

interface BettingPanelProps {
  bet: BetState;
  mySeat: Seat | null;
  onAccept: () => void;
  onRaise: () => void;
  onReject: () => void;
}

export function BettingPanel({ bet, mySeat, onAccept, onRaise, onReject }: BettingPanelProps) {
  const isMyCall = bet.calledBy === mySeat;
  const pendingValue = bet.pendingLevel ?? 0;
  const callName = BET_NAMES[pendingValue] ?? String(pendingValue);
  const canRaise = mySeat ? canRaiseBet(bet, mySeat) : false;

  // Only show the panel to the opponent of the caller
  if (isMyCall) {
    return (
      <Modal open>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            Você pediu {callName}
          </p>
          <p style={{ marginTop: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
            Aguardando resposta do oponente...
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
            Oponente pediu
          </p>
          <p style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {callName}!
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
            mão vale {pendingValue} pontos
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Button onClick={onAccept}>Aceitar ({pendingValue} pts)</Button>

          {canRaise && (
            <Button variant="ghost" onClick={onRaise}>
              Aumentar para {BET_NAMES[(pendingValue + 2) as keyof typeof BET_NAMES] ?? pendingValue + 2}
            </Button>
          )}

          <Button variant="danger" onClick={onReject}>
            Correr ({bet.currentLevel} pts para eles)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
