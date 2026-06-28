import type { Card } from '@/engine/types';
import { SUIT_SYMBOL, SUIT_COLOR } from '@/lib/constants';

interface CardFaceProps {
  card: Card;
}

export function CardFace({ card }: CardFaceProps) {
  const symbol = SUIT_SYMBOL[card.suit];
  const color = SUIT_COLOR[card.suit];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: card.isManilha
          ? 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)'
          : '#f8f8f6',
        borderRadius: 'var(--card-radius)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '6px 8px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Manilha glow ring */}
      {card.isManilha && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--card-radius)',
            border: '1.5px solid rgba(255,215,0,0.5)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Top-left rank + suit */}
      <div style={{ color, lineHeight: 1, textAlign: 'left' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: card.isManilha ? '#ffd700' : color }}>
          {card.rank}
        </div>
        <div style={{ fontSize: '11px', marginTop: '1px' }}>{symbol}</div>
      </div>

      {/* Center symbol */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '26px',
          color: card.isManilha ? 'rgba(255,215,0,0.8)' : color,
          opacity: 0.9,
        }}
      >
        {symbol}
      </div>

      {/* Bottom-right rank + suit (rotated) */}
      <div
        style={{
          color,
          lineHeight: 1,
          textAlign: 'right',
          transform: 'rotate(180deg)',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 700, color: card.isManilha ? '#ffd700' : color }}>
          {card.rank}
        </div>
        <div style={{ fontSize: '11px', marginTop: '1px' }}>{symbol}</div>
      </div>
    </div>
  );
}
