import type { Card } from '@/engine/types';
import { SUIT_SYMBOL, SUIT_COLOR } from '@/lib/constants';

interface CardFaceProps {
  card: Card;
}

export function CardFace({ card }: CardFaceProps) {
  const symbol = SUIT_SYMBOL[card.suit];
  const color = card.isManilha ? '#d4a017' : SUIT_COLOR[card.suit];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: card.isManilha
          ? 'linear-gradient(145deg, #1c1a2e 0%, #0e0c1e 100%)'
          : '#f7f5f0',
        borderRadius: 'var(--card-radius)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {card.isManilha && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--card-radius)',
            border: '1.5px solid rgba(212,160,23,0.55)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={{
          fontSize: '34px',
          fontWeight: 800,
          lineHeight: 1,
          color,
          letterSpacing: '-0.02em',
        }}
      >
        {card.rank}
      </div>

      <div
        style={{
          fontSize: '22px',
          lineHeight: 1,
          color,
          opacity: card.isManilha ? 0.9 : 0.85,
        }}
      >
        {symbol}
      </div>
    </div>
  );
}
