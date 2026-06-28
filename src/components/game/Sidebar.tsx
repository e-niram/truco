import type { Seat, Trick } from '@/engine/types';
import { RoundIndicator } from './RoundIndicator';

interface SidebarProps {
  scores: { player1: number; player2: number };
  mySeat: Seat | null;
  currentTurn: Seat | null;
  tricks: Trick[];
  currentRound: 1 | 2 | 3;
  canCallTruco: boolean;
  onCallTruco: () => void;
  actionPending: boolean;
}

interface ScoreBubbleProps {
  label: string;
  score: number;
  isActive: boolean;
  isMe: boolean;
}

function ScoreBubble({ label, score, isActive, isMe }: ScoreBubbleProps) {
  const activeColor = isMe ? 'var(--color-accent)' : 'var(--color-secondary)';
  const activeDim = isMe ? 'var(--color-accent-dim)' : 'var(--color-secondary-dim)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
      <span
        style={{
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: isActive ? activeColor : 'rgba(255,255,255,0.25)',
          transition: 'color 300ms ease',
        }}
      >
        {label}
      </span>

      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: isActive ? activeDim : 'rgba(255,255,255,0.04)',
          border: `2px solid ${isActive ? activeColor : 'rgba(255,255,255,0.1)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 300ms ease',
          boxShadow: isActive ? `0 0 12px ${activeColor}44` : 'none',
        }}
      >
        <span
          style={{
            fontSize: '18px',
            fontWeight: 800,
            color: isActive ? activeColor : 'rgba(255,255,255,0.45)',
            lineHeight: 1,
            transition: 'color 300ms ease',
          }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

export function Sidebar({
  scores,
  mySeat,
  currentTurn,
  tricks,
  currentRound,
  canCallTruco,
  onCallTruco,
  actionPending,
}: SidebarProps) {
  const myScore = mySeat ? scores[mySeat] : scores.player1;
  const opponentSeat: Seat = mySeat === 'player1' ? 'player2' : 'player1';
  const theirScore = scores[opponentSeat];

  const isMyTurn = currentTurn !== null && currentTurn === mySeat;
  const isTheirTurn = currentTurn !== null && currentTurn !== mySeat;

  return (
    <div
      style={{
        width: '80px',
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 8px 32px',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.25)',
      }}
    >
      {/* Opponent score — top, aligned with their cards */}
      <ScoreBubble
        label="OPP"
        score={theirScore}
        isActive={isTheirTurn}
        isMe={false}
      />

      {/* Round indicator — middle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontSize: '8px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.2)',
          }}
        >
          MÃO
        </span>
        <RoundIndicator tricks={tricks} currentRound={currentRound} mySeat={mySeat} />
      </div>

      {/* My score + Truco — bottom, aligned with player cards */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
        {canCallTruco && (
          <button
            onClick={onCallTruco}
            disabled={actionPending}
            style={{
              width: '100%',
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '9px',
              padding: '9px 0',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.1em',
              cursor: actionPending ? 'not-allowed' : 'pointer',
              opacity: actionPending ? 0.55 : 1,
              transition: 'opacity 150ms ease',
              boxShadow: '0 2px 10px rgba(249,115,22,0.35)',
            }}
          >
            TRUCO
          </button>
        )}

        <ScoreBubble
          label="VOCÊ"
          score={myScore}
          isActive={isMyTurn}
          isMe={true}
        />
      </div>
    </div>
  );
}
