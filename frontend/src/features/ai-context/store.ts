import { create } from 'zustand';
import type { AiContextPayload } from './types';

interface AiContextState {
  snapshot: AiContextPayload | null;
  setSnapshot: (p: AiContextPayload) => void;
  clear: () => void;
}

export const useAiContextStore = create<AiContextState>((set) => ({
  snapshot: null,
  setSnapshot: (p) => set({ snapshot: p }),
  clear: () => set({ snapshot: null }),
}));
