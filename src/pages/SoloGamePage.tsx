import { usePlayerIdentity } from '@/hooks/usePlayerIdentity';
import { GameBoard } from '@/components/game/GameBoard';

export function SoloGamePage() {
  const { token } = usePlayerIdentity();

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--color-table)' }}>
      <GameBoard gameId="solo" token={token} mode="solo" />
    </div>
  );
}
