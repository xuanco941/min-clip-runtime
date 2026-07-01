import { motion } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  ListTodo,
  Film,
  FolderOpen,
  Music,
  Wrench,
  Settings as SettingsIcon,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { cn } from "../lib/utils";
import { RUNTIME_VERSION } from "../../main/runtime-config";

const items = [
  { to: "/", label: "Tạo video", icon: Home, hint: "Tạo video từ chủ đề" },
  { to: "/tasks", label: "Tác vụ", icon: ListTodo, hint: "Theo dõi tiến trình" },
  { to: "/library", label: "Thư viện", icon: Film, hint: "Video đã hoàn thành" },
  { to: "/materials", label: "Materials", icon: FolderOpen, hint: "Video & ảnh nguồn" },
  { to: "/bgm", label: "Nhạc nền", icon: Music, hint: "Quản lý BGM" },
  { to: "/tools", label: "Công cụ", icon: Wrench, hint: "Script, từ khoá" },
  { to: "/settings", label: "Cài đặt", icon: SettingsIcon, hint: "Cấu hình & API key" },
  { to: "/guide", label: "Hướng dẫn", icon: BookOpen, hint: "Cách dùng app" },
];

export default function Sidebar() {
  const location = useLocation();
  return (
    <aside className="w-60 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)]/60 backdrop-blur-xl">
      <div className="p-5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sparkles size={18} />
          </motion.div>
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg font-bold gradient-text leading-none"
            >
              min-clip
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[10px] text-muted mt-0.5 uppercase tracking-widest"
            >
              AI Video Studio
            </motion.p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scroll-fade">
        {items.map((item, i) => {
          const Icon = item.icon;
          const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          return (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
            >
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  active
                    ? "text-white"
                    : "text-muted hover:text-text hover:bg-white/[0.04]",
                )}
              >
                {active && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "var(--gradient-primary)" }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-3 w-full">
                  <Icon size={17} className={active ? "" : "group-hover:text-[var(--color-accent)] transition-colors"} />
                  <span className="flex-1">{item.label}</span>
                </span>
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="p-4 border-t border-[var(--color-border)]"
      >
        <div className="rounded-xl p-3 bg-gradient-to-br from-[var(--color-accent)]/10 to-[var(--color-accent-3)]/10 border border-[var(--color-border)]">
          <div className="text-xs font-semibold flex items-center gap-1.5">
            <Sparkles size={12} className="text-[var(--color-accent)]" />
            Phiên bản {RUNTIME_VERSION}
          </div>
          <div className="text-[10px] text-muted mt-2 leading-relaxed">
            Miễn phí • Thiết kế bởi <b className="text-text">Đỗ Văn Xuân</b>
          </div>
          <button
            onClick={() => window.minclip.api.openExternal("https://www.facebook.com/xuanco941/")}
            className="text-[10px] text-[var(--color-accent)] hover:underline mt-0.5"
          >
            facebook.com/xuanco941
          </button>
        </div>
      </motion.div>
    </aside>
  );
}