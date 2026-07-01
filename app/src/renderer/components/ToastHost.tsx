import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../lib/utils";
import { useToastStore } from "../lib/toast-store";
import type { ToastKind } from "./Toast";

const ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const COLOR: Record<ToastKind, string> = {
  success: "text-[var(--color-success)]",
  error: "text-[var(--color-danger)]",
  info: "text-[var(--color-accent)]",
};

/**
 * Render toàn bộ toast toàn cục, xếp chồng dọc ở góc trên-phải.
 * Gắn 1 lần trong App.tsx.
 */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 24, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl max-w-sm",
                "backdrop-blur-xl bg-[var(--color-panel)] border border-[var(--color-border-strong)]",
                "shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
              )}
            >
              <Icon size={18} className={cn("shrink-0", COLOR[t.kind])} />
              <span className="text-sm font-medium break-words">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="ml-1 shrink-0 text-muted hover:text-text transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
