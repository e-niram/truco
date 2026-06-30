import type { BetState, Seat } from '@/engine/types';
import { canRaiseBet } from '@/engine/betting';
import { useLanguage } from '@/lib/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

const BET_LEVEL_KEY: Record<number, TranslationKey> = {
  4: 'betTruco',
  6: 'betSix',
  10: 'betTen',
  12: 'betTwelve',
};

interface BettingPanelProps {
  bet: BetState;
  mySeat: Seat | null;
  onAccept: () => void;
  onRaise: () => void;
  onReject: () => void;
}

export function BettingPanel({ bet, mySeat, onAccept, onRaise, onReject }: BettingPanelProps) {
  const { t } = useLanguage();
  const isMyCall = bet.calledBy === mySeat;
  const pendingValue = bet.pendingLevel ?? 0;
  const callName = BET_LEVEL_KEY[pendingValue] ? t(BET_LEVEL_KEY[pendingValue]) : String(pendingValue);
  const canRaise = mySeat ? canRaiseBet(bet, mySeat) : false;
  const nextKey = BET_LEVEL_KEY[pendingValue + 2];
  const nextName = nextKey ? t(nextKey) : String(pendingValue + 2);

  if (isMyCall) {
    return (
      <Modal open>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: '14px' }}>
            {t('youCalled')} {callName}
          </p>
          <p style={{ marginTop: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.62)' }}>
            {t('waitingResponse')}
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.62)', marginBottom: '6px' }}>
            {t('opponentCalled')}
          </p>
          <p style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {callName}!
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.62)', marginTop: '4px' }}>
            {t('handWorth', { value: pendingValue })}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Button onClick={onAccept}>{t('accept', { value: pendingValue })}</Button>

          {canRaise && (
            <Button variant="ghost" onClick={onRaise}>
              {t('raiseTo', { name: nextName })}
            </Button>
          )}

          <Button variant="danger" onClick={onReject}>
            {t('fold', { value: bet.currentLevel })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
