import type { Card as CardType } from '@/engine/types';
import { Card } from '@/components/cards/Card';

interface PlayerHandProps {
  hand: CardType[];
  isMyTurn: boolean;
  onPlayCard: (cardId: string) => void;
  /** Mão de ferro: both players are at 10 and play "no escuro" — cards stay face-down. */
  blind?: boolean;
}

export function PlayerHand({ hand, isMyTurn, onPlayCard, blind = false }: PlayerHandProps) {
  const angles = hand.length === 3 ? [-6, 0, 6] : hand.length === 2 ? [-4, 4] : [0];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: '8px',
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
            faceDown={blind}
            layoutId={card.id}
            interactive={isMyTurn}
            onClick={() => { if (isMyTurn) onPlayCard(card.id); }}
            dealDelay={i * 0.08}
          />
        </div>
      ))}
    </div>
  );
}
