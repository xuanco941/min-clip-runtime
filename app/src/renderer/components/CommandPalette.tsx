import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, Home, ListTodo, Film, FolderOpen, Music, Wrench, Settings as SettingsIcon, ArrowRight } from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const close = () => setOpen(false);
  const go = (path: string) => () => {
    navigate(path);
    close();
  };

  const items: CommandItem[] = useMemo(
    () => [
      {
        id: "home",
        label: "Tạo video mới",
        hint: "Mở form tạo video",
        icon: <Home size={14} />,
        action: go("/"),
      },
      {
        id: "tasks",
        label: "Xem tác vụ",
        hint: "Danh sách + polling",
        icon: <ListTodo size={14} />,
        action: go("/tasks"),
      },
      {
        id: "library",
        label: "Thư viện video",
        hint: "Video đã hoàn thành",
        icon: <Film size={14} />,
        action: go("/library"),
      },
      {
        id: "materials",
        label: "Materials",
        hint: "Video & ảnh local",
        icon: <FolderOpen size={14} />,
        action: go("/materials"),
      },
      {
        id: "bgm",
        label: "Nhạc nền",
        hint: "BGM đã upload",
        icon: <Music size={14} />,
        action: go("/bgm"),
      },
      {
        id: "tools",
        label: "Công cụ AI",
        hint: "Script, từ khoá, metadata",
        icon: <Wrench size={14} />,
        action: go("/tools"),
      },
      {
        id: "settings",
        label: "Cài đặt",
        hint: "API key + hệ thống",
        icon: <SettingsIcon size={14} />,
        action: go("/settings"),
      },
    ],
    [navigate],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q),
    );
  }, [query, items]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/70 backdrop-blur-md"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.95, y: -16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="w-full max-w-xl rounded-2xl glass-strong overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
              <Search size={16} className="text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(a + 1, filtered.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(a - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    filtered[active]?.action();
                  }
                }}
                placeholder="Tìm trang hoặc chức năng…"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted"
              />
              <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 border border-[var(--color-border)] text-muted">
                ESC
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="text-center text-xs text-muted py-12">
                  Không tìm thấy — thử từ khoá khác
                </div>
              ) : (
                filtered.map((item, i) => (
                  <motion.button
                    key={item.id}
                    onMouseEnter={() => setActive(i)}
                    onClick={item.action}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      active === i
                        ? "bg-gradient-to-r from-[var(--color-accent)]/15 to-[var(--color-accent-3)]/15"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center ${
                        active === i
                          ? "bg-[var(--color-accent)]/25 text-[var(--color-accent)]"
                          : "bg-white/[0.04] text-muted"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{item.label}</div>
                      {item.hint && <div className="text-[11px] text-muted">{item.hint}</div>}
                    </div>
                    {active === i && <ArrowRight size={14} className="text-[var(--color-accent)]" />}
                  </motion.button>
                ))
              )}
            </div>
            <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center justify-between text-[10px] text-muted">
              <span>↑↓ để di chuyển • Enter để mở</span>
              <span>min-clip palette</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}