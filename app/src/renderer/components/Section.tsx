import { motion, AnimatePresence } from "framer-motion";
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

interface SectionProps {
  title: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  accent?: boolean;
}

export function Section({
  title,
  icon,
  badge,
  collapsible = false,
  defaultOpen = true,
  children,
  className,
  accent = false,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "rounded-2xl backdrop-blur-xl border overflow-hidden",
        "bg-[var(--color-panel)] border-[var(--color-border)]",
        accent && "shadow-[0_0_32px_rgba(139,92,246,0.18)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={collapsible ? () => setOpen(!open) : undefined}
        className={cn(
          "w-full px-5 py-4 flex items-center justify-between gap-3 transition-colors",
          collapsible && "hover:bg-white/[0.02] cursor-pointer",
          !collapsible && "cursor-default",
        )}
      >
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="text-[var(--color-accent)] flex items-center">
              {icon}
            </div>
          )}
          <span className="text-sm font-semibold tracking-wide">{title}</span>
          {badge && <div className="ml-1">{badge}</div>}
        </div>
        {collapsible && (
          <motion.div animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-muted" />
          </motion.div>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}