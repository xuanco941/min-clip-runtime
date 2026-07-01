import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronDown, ChevronUp, X, ListTodo } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTasks } from "../lib/store";
import { TASK_STATE_PROCESSING } from "../lib/api-types";
import type { TaskData } from "../lib/api-types";

function subjectOf(task: TaskData): string {
  const s = task.params?.video_subject?.trim();
  return s || `Tác vụ ${task.task_id.slice(0, 8)}`;
}

/**
 * Thanh task mini nổi góc dưới-phải. Tự hiện khi có task đang chạy
 * (xác nhận "lệnh tạo đã chạy" + đếm "bao nhiêu task"). Tự ẩn khi về 0.
 * Fetch page lớn vì backend phân trang oldest-first (task mới ở cuối).
 */
export function MiniTaskBar() {
  const navigate = useNavigate();
  const { data } = useTasks(1, 100);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevCount = useRef(0);

  const active = (data?.tasks ?? []).filter((t) => t.state === TASK_STATE_PROCESSING);
  const count = active.length;

  // Có task mới chạy lại → bỏ trạng thái "đã đóng" để hiện lên.
  useEffect(() => {
    if (count > prevCount.current) setDismissed(false);
    prevCount.current = count;
  }, [count]);

  const visible = count > 0 && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl glass-strong border border-[var(--color-border-strong)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
            <Loader2 size={15} className="animate-spin text-[var(--color-accent)] shrink-0" />
            <span className="text-sm font-semibold flex-1 min-w-0">
              Đang tạo video ({count})
            </span>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-text hover:bg-white/5 transition-colors"
              title={collapsed ? "Mở rộng" : "Thu gọn"}
            >
              {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-text hover:bg-white/5 transition-colors"
              title="Ẩn"
            >
              <X size={14} />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                  {active.map((t) => {
                    const progress = t.progress ?? 0;
                    return (
                      <button
                        key={t.task_id}
                        onClick={() => navigate("/tasks")}
                        className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-medium truncate">{subjectOf(t)}</span>
                          <span className="text-[10px] font-mono text-muted shrink-0">
                            {progress}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full"
                            style={{ background: "var(--gradient-primary)" }}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => navigate("/tasks")}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs text-[var(--color-accent)] border-t border-[var(--color-border)] hover:bg-white/5 transition-colors"
                >
                  <ListTodo size={12} /> Xem tất cả tác vụ
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
