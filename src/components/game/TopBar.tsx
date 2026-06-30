import type { Seat, Trick } from '@/engine/types';
import { useLanguage } from '@/lib/LanguageContext';

interface TopBarProps {
  scores: { player1: number; player2: number };
  mySeat: Seat | null;
  currentTurn: Seat | null;
  tricks: Trick[];
  currentRound: 1 | 2 | 3;
  pointsAtStake: number;
}

function RoundDots({
  tricks,
  currentRound,
  mySeat,
}: {
  tricks: Trick[];
  currentRound: 1 | 2 | 3;
  mySeat: Seat | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', alignItems: 'center' }}>
      {([1, 2, 3] as const).map((round) => {
        const trick = tricks.find((t) => t.roundNumber === round);
        const isActive = round === currentRound && !trick?.winner;
        const winner = trick?.winner;
        const iWon = mySeat && winner === mySeat;
        const theyWon = mySeat && winner && winner !== mySeat && winner !== 'tie';
        const isTie = winner === 'tie';

        let bg = 'rgba(255,255,255,0.08)';
        let border = 'rgba(255,255,255,0.12)';
        if (iWon) {
          bg = 'var(--color-accent)';
          border = 'var(--color-accent)';
        } else if (theyWon) {
          bg = 'var(--color-secondary)';
          border = 'var(--color-secondary)';
        } else if (isTie) {
          bg = 'rgba(255,255,255,0.45)';
          border = 'rgba(255,255,255,0.45)';
        } else if (isActive) {
          bg = 'rgba(255,255,255,0.22)';
          border = 'rgba(255,255,255,0.55)';
        }

        return (
          <div
            key={round}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: bg,
              border: `1.5px solid ${border}`,
              transition: 'all 300ms ease',
            }}
          />
        );
      })}
    </div>
  );
}

interface ScoreChipProps {
  label: string;
  score: number;
  isActive: boolean;
  isMe: boolean;
  align: 'left' | 'right';
}

function ScoreChip({ label, score, isActive, isMe, align }: ScoreChipProps) {
  const activeColor = isMe ? 'var(--color-accent)' : 'var(--color-secondary)';
  const isRight = align === 'right';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isRight ? 'flex-end' : 'flex-start',
        gap: '4px',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.09em',
          color: isActive ? activeColor : 'rgba(255,255,255,0.35)',
          transition: 'color 300ms ease',
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          flexDirection: isRight ? 'row-reverse' : 'row',
        }}
      >
        <div
          style={{
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            flexShrink: 0,
            background: isActive ? activeColor : 'rgba(255,255,255,0.12)',
            boxShadow: isActive ? `0 0 8px ${activeColor}` : 'none',
            transition: 'all 300ms ease',
          }}
        />
        <span
          style={{
            fontSize: '28px',
            fontWeight: 800,
            lineHeight: 1,
            color: isActive ? '#fff' : 'rgba(255,255,255,0.62)',
            transition: 'color 300ms ease',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

export function TopBar({
  scores,
  mySeat,
  currentTurn,
  tricks,
  currentRound,
  pointsAtStake,
}: TopBarProps) {
  const { t } = useLanguage();
  const myScore = mySeat ? scores[mySeat] : scores.player1;
  const opponentSeat: Seat = mySeat === 'player1' ? 'player2' : 'player1';
  const theirScore = scores[opponentSeat];

  const isMyTurn = currentTurn !== null && currentTurn === mySeat;
  const isTheirTurn = currentTurn !== null && currentTurn !== mySeat;
  const stakesElevated = pointsAtStake > 2;

  return (
    <div
      style={{
        width: '100%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.22)',
      }}
    >
      {/* Left: opponent score */}
      <div style={{ flex: 1 }}>
        <ScoreChip
          label={t('opp')}
          score={theirScore}
          isActive={isTheirTurn}
          isMe={false}
          align="left"
        />
      </div>

      {/* Center: round label + dots with stakes value inline to their right */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '5px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: '8px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.2)',
          }}
        >
          {t('hand')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <RoundDots tricks={tricks} currentRound={currentRound} mySeat={mySeat} />
          <span
            style={{
              fontSize: '20px',
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: stakesElevated ? 'var(--color-accent)' : 'rgba(255,255,255,0.2)',
              transition: 'color 300ms ease',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pointsAtStake}
          </span>
        </div>
      </div>

      {/* Right: my score */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <ScoreChip
          label={t('you')}
          score={myScore}
          isActive={isMyTurn}
          isMe={true}
          align="right"
        />
      </div>
    </div>
  );
}
