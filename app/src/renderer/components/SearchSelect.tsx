import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Check, X } from "lucide-react";

export interface SearchSelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  emptyText?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

/** Dropdown có ô tìm kiếm — chọn 1 mục từ danh sách dài (vd file nhạc). */
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Chọn…",
  emptyText = "Không có mục nào",
  allowClear = true,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase())),
    [options, q],
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="input flex items-center justify-between gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected ? "truncate" : "text-muted truncate"}>{selected?.label ?? placeholder}</span>
        <span className="flex items-center gap-1 shrink-0">
          {allowClear && value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-muted hover:text-text"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown size={14} className="text-muted" />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl glass-strong overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]">
              <Search size={13} className="text-muted shrink-0" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm…"
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-3 text-xs text-muted text-center">{emptyText}</div>
              ) : (
                filtered.map((o) => {
                  const active = o.value === value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                        setQ("");
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        active ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]" : "hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{o.label}</div>
                        {o.hint && <div className="text-[10px] text-muted truncate">{o.hint}</div>}
                      </div>
                      {active && <Check size={13} className="shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
