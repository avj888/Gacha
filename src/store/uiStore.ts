import { create } from 'zustand';

export interface Toast {
  id: number;
  text: string;
  tone?: 'info' | 'good' | 'bad' | 'system';
}

interface UiStore {
  toasts: Toast[];
  toast: (text: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
export const useUi = create<UiStore>((set, get) => ({
  toasts: [],
  toast: (text, tone = 'info') => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-2), { id, text, tone }] });
    setTimeout(() => get().dismiss(id), 2600);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (text: string, tone?: Toast['tone']) => useUi.getState().toast(text, tone);
