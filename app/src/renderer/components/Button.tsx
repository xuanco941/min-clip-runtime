import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "../lib/utils";

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: "primary" | "ghost" | "danger";
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  fullWidth?: boolean;
};

export function Button({
  variant = "ghost",
  loading = false,
  size = "md",
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const sizeCls =
    size === "sm"
      ? "px-3 py-1.5 text-xs"
      : size === "lg"
        ? "px-6 py-3 text-base"
        : "px-4 py-2 text-sm";
  const variantCls =
    variant === "primary"
      ? "btn-primary text-white"
      : variant === "danger"
        ? "btn-danger"
        : "btn-ghost";

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all relative overflow-hidden",
        sizeCls,
        variantCls,
        fullWidth && "w-full",
        (disabled || loading) && "opacity-60 cursor-not-allowed",
        className,
      )}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {variant === "primary" && !loading && (
        <span className="absolute inset-0 shimmer opacity-0 hover:opacity-100 transition-opacity" />
      )}
      {loading ? (
        <Loader2 size={size === "sm" ? 12 : 14} className="animate-spin" />
      ) : icon ? (
        <span className="flex items-center">{icon}</span>
      ) : null}
      <span className="relative z-10">{children as React.ReactNode}</span>
      {variant === "primary" && !loading && (
        <span className="relative z-10 flex items-center">
          <Sparkles size={12} className="opacity-70" />
        </span>
      )}
    </motion.button>
  );
}