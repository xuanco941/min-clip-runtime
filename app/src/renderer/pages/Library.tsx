import { useMemo } from "react";
import { motion } from "framer-motion";
import { Film, Download, Trash2, Search, Share2, Play, X } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/Toast";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SkeletonGrid } from "../components/Skeleton";
import { useAppStore, useDeleteTask, useTasks } from "../lib/store";
import { API_PATHS } from "../lib/api";
import { TASK_STATE_COMPLETE } from "../lib/api-types";
import { formatDate } from "../lib/utils";

export default function Library() {
  const baseUrl = useAppStore((s) => s.baseUrl);
  const { data, isLoading } = useTasks(1, 100);
  const del = useDeleteTask();
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);

  const videos = useMemo(() => {
    const list: Array<{
      taskId: string;
      play: string;
      download: string;
      subject: string;
      date: number;
    }> = [];
    for (const t of data?.tasks ?? []) {
      if (t.state !== TASK_STATE_COMPLETE) continue;
      for (const v of t.videos ?? []) {
        const raw = String(v);
        let play = raw;
        let download = raw;
        if (!/^https?:\/\//i.test(raw)) {
          // raw có thể là "/tasks/<id>/final-1.mp4" hoặc đường dẫn tuyệt đối.
          // Dựng lại đường dẫn tương đối theo task: "<id>/<tên file>".
          const filename = raw.split(/[\\/]/).pop() || "";
          const rel = `${encodeURIComponent(t.task_id)}/${encodeURIComponent(filename)}`;
          // Phát qua static mount /tasks (hỗ trợ tua); tải qua /api/v1/download.
          play = baseUrl ? `${baseUrl}/tasks/${rel}` : raw;
          download = baseUrl ? `${baseUrl}${API_PATHS.download(rel)}` : raw;
        }
        list.push({
          taskId: t.task_id,
          play,
          download,
          subject: t.params?.video_subject || t.task_id,
          date: Date.now(),
        });
      }
    }
    return list.filter((v) =>
      search ? v.subject.toLowerCase().includes(search.toLowerCase()) : true,
    );
  }, [data, baseUrl, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Thư viện"
        subtitle="Tất cả video đã hoàn thành của bạn"
        icon={<Film size={20} />}
      />

      <Card>
        <div className="flex items-center gap-2">
          <Search size={14} className="text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo chủ đề…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <span className="text-xs text-muted">{videos.length} video</span>
        </div>
      </Card>

      {isLoading ? (
        <SkeletonGrid count={6} />
      ) : videos.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Film size={32} />}
            title="Thư viện trống"
            description="Khi video đầu tiên hoàn thành, nó sẽ xuất hiện ở đây. Bấm 'Tạo video ngay' để bắt đầu."
            action={
              <a href="#/" className="inline-block">
                <Button variant="primary">Tạo video ngay</Button>
              </a>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {videos.map((v, i) => (
            <motion.div
              key={`${v.taskId}-${v.play}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              whileHover={{ y: -4 }}
            >
              <Card hover className="p-3 group">
                <div
                  onClick={() => setPlaying(v.play)}
                  className="aspect-[9/16] rounded-xl bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-accent-3)]/20 flex items-center justify-center cursor-pointer relative overflow-hidden border border-[var(--color-border)]"
                >
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100" />
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <Play size={20} fill="white" />
                  </motion.div>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-semibold line-clamp-2">{v.subject}</div>
                  <div className="text-[10px] text-muted mt-1 font-mono">{v.taskId.slice(0, 8)}</div>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <button
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = v.download;
                      a.download = `${v.subject.slice(0, 20)}.mp4`;
                      a.click();
                    }}
                    className="flex-1 py-1.5 rounded-md text-[10px] flex items-center justify-center gap-1 hover:bg-white/5 transition-colors"
                  >
                    <Download size={11} /> Tải
                  </button>
                  <button className="flex-1 py-1.5 rounded-md text-[10px] flex items-center justify-center gap-1 hover:bg-white/5 transition-colors">
                    <Share2 size={11} /> Chia sẻ
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("Xoá video này?")) await del.mutateAsync(v.taskId);
                    }}
                    className="px-2 py-1.5 rounded-md text-[10px] flex items-center justify-center hover:bg-[var(--color-danger)]/20 text-muted hover:text-[var(--color-danger)] transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {playing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPlaying(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white"
            onClick={() => setPlaying(null)}
          >
            <X size={20} />
          </button>
          <motion.video
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            src={playing}
            controls
            autoPlay
            className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </div>
  );
}