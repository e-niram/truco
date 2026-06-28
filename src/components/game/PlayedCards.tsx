import type { Trick, Seat } from '@/engine/types';
import { Card } from '@/components/cards/Card';

interface PlayedCardsProps {
  trick: Trick;
  mySeat: Seat | null;
}

export function PlayedCards({ trick, mySeat }: PlayedCardsProps) {
  const myCard = mySeat === 'player1' ? trick.player1Card : trick.player2Card;
  const theirCard = mySeat === 'player1' ? trick.player2Card : trick.player1Card;

  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Their card (opponent — top of visual stack) */}
      <div style={{ position: 'relative' }}>
        {theirCard ? (
          <Card
            card={theirCard}
            layoutId={`played-${theirCard.id}`}
            faceDown={false}
          />
        ) : (
          <EmptySlot label="aguardando" />
        )}
      </div>

      {/* My card */}
      <div style={{ position: 'relative' }}>
        {myCard ? (
          <Card
            card={myCard}
            layoutId={`played-${myCard.id}`}
            faceDown={false}
          />
        ) : (
          <EmptySlot label="sua carta" />
        )}
      </div>
    </div>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <div
      style={{
        width: 'var(--card-width)',
        height: 'var(--card-height)',
        borderRadius: 'var(--card-radius)',
        border: '1.5px dashed rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
        {label}
      </span>
    </div>
  );
}
