import { Card } from '@/components/cards/Card';

interface OpponentHandProps {
  cardCount: number;
}

export function OpponentHand({ cardCount }: OpponentHandProps) {
  const angles =
    cardCount === 3 ? [-6, 0, 6] : cardCount === 2 ? [-4, 4] : [0];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      {Array.from({ length: cardCount }).map((_, i) => (
        <div
          key={i}
          style={{
            transform: `rotate(${angles[i] ?? 0}deg) rotate(180deg)`,
            transformOrigin: 'top center',
          }}
        >
          <Card faceDown dealDelay={i * 0.06} />
        </div>
      ))}
    </div>
  );
}
