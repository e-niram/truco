import type { Trick, Seat } from '@/engine/types';

interface RoundIndicatorProps {
  tricks: Trick[];
  currentRound: 1 | 2 | 3;
  mySeat: Seat | null;
}

export function RoundIndicator({ tricks, currentRound, mySeat }: RoundIndicatorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
      {[1, 2, 3].map((round) => {
        const trick = tricks.find((t) => t.roundNumber === round);
        const isActive = round === currentRound && !trick?.winner;
        const winner = trick?.winner;
        const iWon = mySeat && winner === mySeat;
        const theyWon = mySeat && winner && winner !== mySeat && winner !== 'tie';
        const isTie = winner === 'tie';

        let bg = 'rgba(255,255,255,0.1)';
        let border = 'rgba(255,255,255,0.12)';
        if (iWon) { bg = 'var(--color-accent)'; border = 'var(--color-accent)'; }
        else if (theyWon) { bg = 'var(--color-secondary)'; border = 'var(--color-secondary)'; }
        else if (isTie) { bg = 'rgba(255,255,255,0.45)'; border = 'rgba(255,255,255,0.45)'; }
        else if (isActive) { bg = 'rgba(255,255,255,0.22)'; border = 'rgba(255,255,255,0.6)'; }

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
