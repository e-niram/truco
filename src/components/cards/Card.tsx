import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Card as CardType } from '@/engine/types';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  interactive?: boolean;
  selected?: boolean;
  played?: boolean;
  onClick?: () => void;
  layoutId?: string;
  dealDelay?: number;
}

export function Card({
  card,
  faceDown = false,
  interactive = false,
  selected = false,
  onClick,
  layoutId,
  dealDelay = 0,
}: CardProps) {
  const [hovered, setHovered] = useState(false);

  const liftY = selected ? -18 : hovered && interactive ? -8 : 0;
  const scale = hovered && interactive ? 1.04 : 1;

  return (
    <motion.div
      layoutId={layoutId}
      initial={{ opacity: 0, y: 40 }}
      animate={{
        opacity: 1,
        y: liftY,
        scale,
        transition: {
          opacity: { delay: dealDelay, duration: 0.3 },
          y: { delay: dealDelay, type: 'spring', stiffness: 400, damping: 30 },
          scale: { duration: 0.15 },
        },
      }}
      onClick={interactive ? onClick : undefined}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        width: 'var(--card-width)',
        height: 'var(--card-height)',
        borderRadius: 'var(--card-radius)',
        cursor: interactive ? 'pointer' : 'default',
        flexShrink: 0,
        boxShadow: selected
          ? '0 0 0 2px #fff, 0 16px 32px rgba(0,0,0,0.5)'
          : hovered && interactive
          ? '0 12px 24px rgba(0,0,0,0.4)'
          : '0 4px 12px rgba(0,0,0,0.3)',
        outline: 'none',
      }}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) onClick?.();
      }}
    >
      {faceDown || !card ? <CardBack /> : <CardFace card={card} />}
    </motion.div>
  );
}
