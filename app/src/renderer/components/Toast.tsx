import { motion, AnimatePresence } from "framer-motion";
import { type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../lib/utils";

export type ToastKind = "success" | "error" | "info";

interface ToastProps {
  kind: ToastKind;
  message: string;
  show: boolean;
  onClose: () => void;
}

export function Toast({ kind, message, show, onClose }: ToastProps) {
  const Icon = kind === "success" ? CheckCircle2 : kind === "error" ? AlertCircle : Info;
  const colorCls =
    kind === "success"
      ? "text-[var(--color-success)]"
      : kind === "error"
        ? "text-[var(--color-danger)]"
        : "text-[var(--color-accent)]";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl",
            "backdrop-blur-xl bg-[var(--color-panel)] border border-[var(--color-border-strong)]",
            "shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
          )}
        >
          <Icon size={18} className={colorCls} />
          <span className="text-sm font-medium">{message}</span>
          <button
            onClick={onClose}
            className="ml-2 text-muted hover:text-text transition-colors"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-between mb-6"
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-accent-3)]/20 text-[var(--color-accent)] border border-[var(--color-border-strong)]">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold gradient-text">{title}</h1>
          {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </motion.div>
  );
}