import { create } from 'zustand';

// ─── 타입 ──────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  /** 자동 닫힘 시간(ms). 기본: error=4500, 그 외=3200 */
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  /** 토스트를 추가하고 생성된 id 반환 */
  show: (item: Omit<ToastItem, 'id'>) => string;
  /** id로 특정 토스트 제거 */
  hide: (id: string) => void;
  /** 전체 초기화 */
  clear: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────

let _seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (item) => {
    const id = `toast-${++_seq}`;
    set((s) => ({ toasts: [...s.toasts, { ...item, id }] }));
    return id;
  },

  hide: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ toasts: [] }),
}));
