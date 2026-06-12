import { create } from 'zustand';
import type { AiContextPayload } from './types';

interface AiContextState {
  snapshot: AiContextPayload | null;
  setSnapshot: (p: AiContextPayload) => void;
  clear: () => void;
  /** 외부 경로(휴가폼 직접 제출)로 드래프트가 완료됐을 때 — artifact를 완료 fact로 치환 */
  completeArtifact: () => void;
}

export const useAiContextStore = create<AiContextState>((set) => ({
  snapshot: null,
  setSnapshot: (p) => set({ snapshot: p }),
  clear: () => set({ snapshot: null }),
  completeArtifact: () =>
    set((s) => {
      if (!s.snapshot?.artifact) return s;
      return {
        snapshot: {
          ...s.snapshot,
          artifact: null,
          blocks: [
            { kind: 'fact', label: s.snapshot.artifact.title || '휴가 신청', value: '신청 완료 · 결재 진행' },
            ...s.snapshot.blocks,
          ],
        },
      };
    }),
}));
