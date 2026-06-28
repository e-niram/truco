import { useMemo } from 'react';
import { getOrCreateToken } from '@/store/playerStore';

export function usePlayerIdentity() {
  const token = useMemo(() => getOrCreateToken(), []);
  return { token };
}
