import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Check, Loader2 } from "lucide-react";
import { i18n, LOCALE_META, setLocale, type LocaleCode } from "../lib/i18n";

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<LocaleCode>((i18n.language as LocaleCode) ?? "vi");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const change = (code: LocaleCode) => {
    setLocale(code);
    setCurrent(code);
    setOpen(false);
  };

  const currentMeta = LOCALE_META.find((l) => l.code === current) ?? LOCALE_META[0];

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs text-muted hover:text-text hover:bg-white/5 transition-colors"
        title="Đổi ngôn ngữ"
      >
        <Globe size={12} />
        <span className="text-sm leading-none">{currentMeta.flag}</span>
        <span className="hidden sm:inline">{currentMeta.code.toUpperCase()}</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-56 rounded-xl glass-strong overflow-hidden z-50"
          >
            {LOCALE_META.map((l, i) => {
              const active = l.code === current;
              return (
                <motion.button
                  key={l.code}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => change(l.code)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                      : "hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="text-base">{l.flag}</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{l.native}</div>
                    <div className="text-[10px] text-muted">{l.label}</div>
                  </div>
                  {active && <Check size={12} />}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}