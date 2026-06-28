import type { Seat } from '@/engine/types';

interface ScoreBarProps {
  scores: { player1: number; player2: number };
  mySeat: Seat | null;
}

function PipRow({ filled, total = 12 }: { filled: number; total?: number }) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: i < filled ? '#ffffff' : 'rgba(255,255,255,0.15)',
            transition: 'background 300ms ease',
          }}
        />
      ))}
    </div>
  );
}

export function ScoreBar({ scores, mySeat }: ScoreBarProps) {
  const myScore = mySeat ? scores[mySeat] : scores.player1;
  const theirSeat = mySeat === 'player1' ? 'player2' : 'player1';
  const theirScore = scores[theirSeat];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '10px 20px',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '100px',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>
          VOCÊ
        </span>
        <PipRow filled={myScore} />
        <span style={{ fontSize: '18px', fontWeight: 600, lineHeight: 1 }}>{myScore}</span>
      </div>

      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>×</span>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>
          OPONENTE
        </span>
        <PipRow filled={theirScore} />
        <span style={{ fontSize: '18px', fontWeight: 600, lineHeight: 1 }}>{theirScore}</span>
      </div>
    </div>
  );
}
