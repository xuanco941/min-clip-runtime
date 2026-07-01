import { create } from "zustand";
import type { ToastKind } from "../components/Toast";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastStore {
  toasts: ToastItem[];
  /** Đẩy 1 toast lên. Tự xoá sau ít giây (lỗi để lâu hơn). */
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
}

// Thời gian hiển thị theo loại — lỗi cần đọc lâu hơn.
const DURATION: Record<ToastKind, number> = {
  success: 4500,
  info: 4500,
  error: 7000,
};

// Chống trùng: cùng message bắn liên tiếp trong khoảng này thì bỏ qua,
// tránh spam khi backend log nhiều dòng error giống nhau.
const DEDUPE_MS = 3000;

let nextId = 1;
const lastSeen = new Map<string, number>();

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (kind, message) => {
    const text = (message || "").trim();
    if (!text) return;

    const now = Date.now();
    const key = `${kind}:${text}`;
    const prev = lastSeen.get(key);
    if (prev && now - prev < DEDUPE_MS) return;
    lastSeen.set(key, now);

    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message: text }] }));
    setTimeout(() => get().dismiss(id), DURATION[kind]);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Helper gọn để đẩy toast từ bất kỳ đâu (kể cả ngoài React). */
export function pushToast(kind: ToastKind, message: string) {
  useToastStore.getState().push(kind, message);
}
