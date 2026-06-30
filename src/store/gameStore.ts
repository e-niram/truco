import { create } from 'zustand';
import type { PublicGameState, Card, Seat } from '@/engine/types';

interface GameStore {
  publicState: PublicGameState | null;
  myHand: Card[];
  mySeat: Seat | null;
  isConnected: boolean;

  setPublicState: (state: PublicGameState) => void;
  forceSetPublicState: (state: PublicGameState) => void;
  setMyHand: (hand: Card[]) => void;
  setMySeat: (seat: Seat | null) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  publicState: null,
  myHand: [],
  mySeat: null,
  isConnected: false,

  setPublicState: (state) =>
    set((prev) => {
      // Only apply if version is newer
      if (prev.publicState && state.version <= prev.publicState.version) return prev;
      return { publicState: state };
    }),

  forceSetPublicState: (state) => set({ publicState: state }),

  setMyHand: (hand) => set({ myHand: hand }),

  setMySeat: (seat) => set({ mySeat: seat }),

  setConnected: (connected) => set({ isConnected: connected }),

  reset: () =>
    set({ publicState: null, myHand: [], mySeat: null, isConnected: false }),
}));
