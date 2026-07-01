import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListTodo,
  RefreshCw,
  Trash2,
  FolderOpen,
  Filter,
  Loader2,
  CheckCircle2,
  XCircle,
  Activity,
  X,
} from "lucide-react";
import { PageHeader } from "../components/Toast";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SkeletonCard } from "../components/Skeleton";
import { useDeleteTask, useTask, useTasks } from "../lib/store";
import { TASK_STATE_COMPLETE, TASK_STATE_FAILED, TASK_STATE_PROCESSING } from "../lib/api-types";
import type { TaskData, TaskState } from "../lib/api-types";
import { formatDate } from "../lib/utils";

type Filter = "all" | "processing" | "complete" | "failed";

export default function Tasks() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, refetch, isFetching } = useTasks(page, 20);
  const del = useDeleteTask();

  const tasks = (data?.tasks ?? []).filter((t) => {
    if (filter === "all") return true;
    if (filter === "processing") return t.state === TASK_STATE_PROCESSING;
    if (filter === "complete") return t.state === TASK_STATE_COMPLETE;
    if (filter === "failed") return t.state === TASK_STATE_FAILED;
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tác vụ"
        subtitle="Theo dõi và quản lý tất cả video đang được tạo"
        icon={<ListTodo size={20} />}
      >
        <Button
          icon={<RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />}
          onClick={() => refetch()}
        >
          Làm mới
        </Button>
      </PageHeader>

      <Card className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted" />
          {(["all", "processing", "complete", "failed"] as Filter[]).map((f) => {
            const active = filter === f;
            const label = { all: "Tất cả", processing: "Đang chạy", complete: "Hoàn thành", failed: "Lỗi" }[f];
            return (
              <motion.button
                key={f}
                whileTap={{ scale: 0.96 }}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  active
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                {label}
              </motion.button>
            );
          })}
        </div>
        <div className="text-xs text-muted">
          Tổng: <span className="text-text font-semibold">{data?.total ?? 0}</span>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ListTodo size={32} />}
            title={filter === "all" ? "Chưa có tác vụ nào" : `Không có tác vụ ${filterLabel(filter)}`}
            description={
              filter === "all"
                ? "Bấm 'Tạo video ngay' ở trang chính để bắt đầu tác vụ đầu tiên"
                : "Thử chuyển sang bộ lọc khác"
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnimatePresence>
            {tasks.map((t, i) => (
              <TaskCard
                key={t.task_id}
                task={t}
                index={i}
                onOpen={() => setSelectedId(t.task_id)}
                onDelete={async () => {
                  if (confirm("Xoá tác vụ này?")) {
                    await del.mutateAsync(t.task_id);
                  }
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {data && data.total > data.page_size && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          <span className="text-xs text-muted px-3">
            Trang {page} / {Math.ceil(data.total / data.page_size)}
          </span>
          <Button
            size="sm"
            disabled={page * data.page_size >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      )}

      <AnimatePresence>
        {selectedId && <TaskDetailModal id={selectedId} onClose={() => setSelectedId(null)} />}
      </AnimatePresence>
    </div>
  );
}

function TaskCard({
  task,
  index,
  onOpen,
  onDelete,
}: {
  task: TaskData;
  index: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const state = task.state;
  const status = stateInfo(state);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={{ y: -2 }}
    >
      <Card hover>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">
              {task.params?.video_subject || "Tác vụ không có tên"}
            </div>
            <div className="text-[10px] text-muted font-mono mt-0.5">{task.task_id}</div>
          </div>
          <span
            className={`chip text-[10px] ${status.chipClass}`}
            style={{ background: status.bg, color: status.fg, border: `1px solid ${status.border}` }}
          >
            {status.icon}
            {status.label}
          </span>
        </div>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-[10px] text-muted">
            <span>Tiến trình</span>
            <span className="text-text font-mono">{task.progress ?? 0}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full"
              style={{ background: status.barColor }}
              initial={{ width: 0 }}
              animate={{ width: `${task.progress ?? 0}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted">
          <span>{formatDate((task as { created_at?: string }).created_at || Date.now())}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpen}
              className="px-2 py-1 rounded-md hover:bg-white/5 text-[var(--color-accent)] transition-colors flex items-center gap-1"
            >
              <Activity size={11} /> Chi tiết
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await window.minclip.api.openTaskFolder(task.task_id);
              }}
              className="px-2 py-1 rounded-md hover:bg-white/5 text-muted hover:text-text transition-colors flex items-center gap-1"
            >
              <FolderOpen size={11} /> Mở
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="px-2 py-1 rounded-md hover:bg-[var(--color-danger)]/20 text-muted hover:text-[var(--color-danger)] transition-colors flex items-center gap-1"
            >
              <Trash2 size={11} /> Xoá
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function filterLabel(f: Filter): string {
  return { all: "", processing: "đang chạy", complete: "hoàn thành", failed: "lỗi" }[f];
}

function stateInfo(state: TaskState | undefined) {
  if (state === TASK_STATE_COMPLETE) {
    return {
      label: "Hoàn thành",
      chipClass: "",
      bg: "rgba(16, 185, 129, 0.15)",
      fg: "rgb(16, 185, 129)",
      border: "rgba(16, 185, 129, 0.4)",
      barColor: "var(--color-success)",
      icon: <CheckCircle2 size={10} />,
    };
  }
  if (state === TASK_STATE_FAILED) {
    return {
      label: "Lỗi",
      chipClass: "",
      bg: "rgba(244, 63, 94, 0.15)",
      fg: "rgb(244, 63, 94)",
      border: "rgba(244, 63, 94, 0.4)",
      barColor: "var(--color-danger)",
      icon: <XCircle size={10} />,
    };
  }
  return {
    label: "Đang xử lý",
    chipClass: "",
    bg: "rgba(139, 92, 246, 0.15)",
    fg: "rgb(139, 92, 246)",
    border: "rgba(139, 92, 246, 0.4)",
    barColor: "var(--gradient-primary)",
    icon: <Loader2 size={10} className="animate-spin" />,
  };
}

function TaskDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useTask(id);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const off = window.minclip.events.onApiLog((entry) => {
      if (entry.message.includes(id.slice(0, 8))) {
        setLogs((prev) => [...prev, entry.message].slice(-100));
      }
    });
    return off;
  }, [id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl glass-strong"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl">
          <div>
            <h3 className="text-lg font-semibold">Chi tiết tác vụ</h3>
            <p className="text-xs text-muted font-mono mt-0.5">{id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 text-muted hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isLoading || !data ? (
            <div className="flex items-center justify-center py-12 text-muted">
              <Loader2 className="animate-spin mr-2" size={18} /> Đang tải…
            </div>
          ) : (
            <>
              <Card>
                <div className="text-sm font-semibold mb-2">{data.params?.video_subject || "—"}</div>
                <div className="text-xs text-muted mb-3">
                  Trạng thái: {stateInfo(data.state).label} • Tiến trình: {data.progress ?? 0}%
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${data.progress ?? 0}%`,
                      background: stateInfo(data.state).barColor,
                    }}
                  />
                </div>
              </Card>

              {data.videos && data.videos.length > 0 && (
                <Card>
                  <div className="text-sm font-semibold mb-3">Video đã tạo</div>
                  <div className="space-y-2">
                    {data.videos.map((v, i) => (
                      <div key={i} className="text-xs font-mono text-muted truncate">
                        {v}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {data.params?.video_script && (
                <Card>
                  <div className="text-sm font-semibold mb-2">Kịch bản</div>
                  <pre className="text-xs whitespace-pre-wrap font-sans text-muted">
                    {data.params.video_script}
                  </pre>
                </Card>
              )}

              <Card>
                <details>
                  <summary className="text-sm font-semibold cursor-pointer">
                    Nhật ký API ({logs.length})
                  </summary>
                  <pre className="mt-2 text-[10px] font-mono text-muted max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {logs.length ? logs.join("\n") : "Chưa có log cho tác vụ này"}
                  </pre>
                </details>
              </Card>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}