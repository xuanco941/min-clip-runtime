import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "minimal";
}

export function EmptyState({ icon, title, description, action, variant = "default" }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`text-center ${variant === "default" ? "py-16" : "py-8"} relative`}
    >
      {icon && (
        <motion.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="mx-auto mb-4 relative inline-flex"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-3)] opacity-20 blur-2xl rounded-full" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-accent-3)]/20 border border-[var(--color-border-strong)] flex items-center justify-center text-[var(--color-accent)]">
            {icon}
          </div>
        </motion.div>
      )}
      <motion.h3
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-base font-semibold mb-1.5"
      >
        {title}
      </motion.h3>
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted max-w-sm mx-auto mb-4"
        >
          {description}
        </motion.p>
      )}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}