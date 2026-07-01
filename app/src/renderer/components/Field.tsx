import { motion, AnimatePresence } from "framer-motion";
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/utils";

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <label className="label">{label}</label>}
      {children}
      <AnimatePresence mode="wait">
        {hint && !error && (
          <motion.p
            key="hint"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-muted"
          >
            {hint}
          </motion.p>
        )}
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-[var(--color-danger)]"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "input",
        "focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-opacity-20",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn("textarea", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn("select", className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={cn("inline-flex items-center gap-2 select-none", disabled && "opacity-50")}>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors duration-200",
          checked
            ? "bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-3)]"
            : "bg-[var(--color-border-strong)]",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md",
          )}
          style={{ x: checked ? 16 : 0 }}
        />
      </button>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}