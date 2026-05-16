import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player } from './types';

const MAX_PLAYERS = 32;
const MAX_NAME_LEN = 24;

type PlayersStore = {
  players: Player[];
  addPlayer: (name: string) => void;
  removePlayer: (index: number) => void;
};

export const usePlayersStore = create<PlayersStore>()(
  persist(
    (set) => ({
      players: [],
      addPlayer: (name) => {
        const trimmed = name.trim().slice(0, MAX_NAME_LEN);
        if (!trimmed) return;
        set((s) => (s.players.length >= MAX_PLAYERS
          ? s
          : { players: [...s.players, { name: trimmed }] }));
      },
      removePlayer: (index) => {
        set((s) => ({ players: s.players.filter((_, i) => i !== index) }));
      },
    }),
    { name: 'festmodus-players' },
  ),
);
