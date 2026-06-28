import type { Trick, Seat } from '@/engine/types';

interface RoundIndicatorProps {
  tricks: Trick[];
  currentRound: 1 | 2 | 3;
  mySeat: Seat | null;
}

export function RoundIndicator({ tricks, currentRound, mySeat }: RoundIndicatorProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {[1, 2, 3].map((round) => {
        const trick = tricks.find((t) => t.roundNumber === round);
        const isActive = round === currentRound && !trick?.winner;
        const winner = trick?.winner;
        const iWon = mySeat && winner === mySeat;
        const theyWon = mySeat && winner && winner !== mySeat && winner !== 'tie';
        const isTie = winner === 'tie';

        return (
          <div
            key={round}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: iWon
                ? '#ffffff'
                : theyWon
                ? 'rgba(255,255,255,0.2)'
                : isTie
                ? 'rgba(255,255,255,0.5)'
                : isActive
                ? 'rgba(255,255,255,0.6)'
                : 'rgba(255,255,255,0.12)',
              border: isActive ? '1.5px solid rgba(255,255,255,0.8)' : '1.5px solid transparent',
              transition: 'all 300ms ease',
            }}
          />
        );
      })}
    </div>
  );
}
