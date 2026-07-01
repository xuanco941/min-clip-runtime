import { motion } from "framer-motion";
import { Sun, Moon, Minus, Square, X, Activity, Search } from "lucide-react";
import { useAppStore } from "../lib/store";
import { useState } from "react";

export default function TopBar() {
  const baseUrl = useAppStore((s) => s.baseUrl);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.classList.contains("light") ? "light" : "dark";
  });

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  return (
    <div
      className="h-10 flex items-center justify-between px-4 border-b border-[var(--color-border)] select-none"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-3 text-xs text-muted"
      >
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]"
            style={{ boxShadow: "0 0 6px rgba(16,185,129,0.6)" }}
          />
          <span>API</span>
          <span className="font-mono text-text/70">{baseUrl ?? "—"}</span>
        </div>
      </motion.div>

      <div
        className="flex items-center gap-1.5"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true } as KeyboardEventInit));
          }}
          className="h-7 px-2.5 rounded-md flex items-center gap-2 text-xs text-muted hover:text-text hover:bg-white/5 transition-colors"
          title="Tìm kiếm nhanh (Ctrl+K)"
        >
          <Search size={11} />
          <span className="hidden md:inline">Tìm nhanh</span>
          <kbd className="hidden md:inline-block px-1 py-0.5 rounded bg-white/5 border border-[var(--color-border)] text-[9px]">
            Ctrl+K
          </kbd>
        </button>
        <button
          onClick={toggleTheme}
          className="w-8 h-7 rounded flex items-center justify-center text-muted hover:text-text hover:bg-white/5 transition-colors"
          title={theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"}
        >
          {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
        </button>
        <div className="w-px h-4 bg-[var(--color-border)] mx-1" />
        <button
          onClick={() => window.minclip.api.minimize()}
          className="w-8 h-7 rounded flex items-center justify-center text-muted hover:text-text hover:bg-white/5 transition-colors"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => window.minclip.api.maximize()}
          className="w-8 h-7 rounded flex items-center justify-center text-muted hover:text-text hover:bg-white/5 transition-colors"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => window.minclip.api.close()}
          className="w-8 h-7 rounded flex items-center justify-center text-muted hover:text-white hover:bg-[var(--color-danger)] transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}