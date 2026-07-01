import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import { cn } from "../lib/utils";

interface CardProps extends HTMLMotionProps<"div"> {
  hover?: boolean;
  glow?: boolean;
  children: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, glow = false, className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        whileHover={hover ? { y: -2, scale: 1.005 } : undefined}
        className={cn(
          "rounded-2xl p-5 backdrop-blur-xl border transition-shadow duration-300",
          "bg-[var(--color-panel)] border-[var(--color-border)]",
          glow && "shadow-[0_0_24px_rgba(139,92,246,0.25)]",
          hover && "hover:shadow-[0_8px_40px_rgba(139,92,246,0.2)]",
          className,
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
Card.displayName = "Card";