import type { Seat, Trick } from '@/engine/types';
import { useLanguage } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

interface TopBarProps {
  scores: { player1: number; player2: number };
  mySeat: Seat | null;
  currentTurn: Seat | null;
  tricks: Trick[];
  currentRound: 1 | 2 | 3;
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
    <div style={{ display: 'flex', flexDirection: 'row', gap: '5px', alignItems: 'center' }}>
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
              width: '7px',
              height: '7px',
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
        gap: '3px',
      }}
    >
      <span
        style={{
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: isActive ? activeColor : 'rgba(255,255,255,0.22)',
          transition: 'color 300ms ease',
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexDirection: isRight ? 'row-reverse' : 'row',
        }}
      >
        <div
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            flexShrink: 0,
            background: isActive ? activeColor : 'rgba(255,255,255,0.1)',
            boxShadow: isActive ? `0 0 7px ${activeColor}` : 'none',
            transition: 'all 300ms ease',
          }}
        />
        <span
          style={{
            fontSize: '24px',
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
}: TopBarProps) {
  const { t } = useLanguage();
  const myScore = mySeat ? scores[mySeat] : scores.player1;
  const opponentSeat: Seat = mySeat === 'player1' ? 'player2' : 'player1';
  const theirScore = scores[opponentSeat];

  const isMyTurn = currentTurn !== null && currentTurn === mySeat;
  const isTheirTurn = currentTurn !== null && currentTurn !== mySeat;

  return (
    <div
      style={{
        width: '100%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '10px 16px',
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

      {/* Center: round label + dots + language switcher */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: '7px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.16)',
          }}
        >
          {t('hand')}
        </span>
        <RoundDots tricks={tricks} currentRound={currentRound} mySeat={mySeat} />
        <LanguageSwitcher compact />
      </div>

      {/* Right: my score */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px',
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
