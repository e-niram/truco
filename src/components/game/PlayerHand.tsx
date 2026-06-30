import { useState } from 'react';
import type { Card as CardType } from '@/engine/types';
import { Card } from '@/components/cards/Card';

interface PlayerHandProps {
  hand: CardType[];
  isMyTurn: boolean;
  onPlayCard: (cardId: string) => void;
}

export function PlayerHand({ hand, isMyTurn, onPlayCard }: PlayerHandProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleCardClick(cardId: string) {
    if (!isMyTurn) return;
    if (selectedId === cardId) {
      // Second tap on selected card → play it
      onPlayCard(cardId);
      setSelectedId(null);
    } else {
      setSelectedId(cardId);
    }
  }

  const angles = hand.length === 3 ? [-6, 0, 6] : hand.length === 2 ? [-4, 4] : [0];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: '8px',
        position: 'relative',
      }}
    >
      {hand.map((card, i) => (
        <div
          key={card.id}
          style={{
            transform: `rotate(${angles[i] ?? 0}deg)`,
            transformOrigin: 'bottom center',
            transition: 'transform 200ms ease',
          }}
        >
          <Card
            card={card}
            layoutId={card.id}
            interactive={isMyTurn}
            selected={selectedId === card.id}
            onClick={() => handleCardClick(card.id)}
            dealDelay={i * 0.08}
          />
        </div>
      ))}

    </div>
  );
}
