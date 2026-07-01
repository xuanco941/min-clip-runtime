import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import type { AppStatusPayload, ApiLogPayload } from "../../preload/types";

interface Props {
  status: AppStatusPayload;
  onRetry: () => void;
}

export default function StartupScreen({ status, onRetry }: Props) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const off = window.minclip.events.onApiLog((entry: ApiLogPayload) => {
      setLogs((prev) => {
        const next = [...prev, `[${entry.level}] ${entry.message}`];
        return next.slice(-50);
      });
    });
    return off;
  }, []);

  const progress = status.progress ?? 0;
  const isError = status.status === "error";
  const isReady = status.status === "ready";

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-transparent text-text p-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[var(--color-accent-3)]/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-white mb-6 float relative z-10"
        style={{ background: "var(--gradient-primary)" }}
      >
        <Sparkles size={36} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-bold gradient-text mb-2 relative z-10"
      >
        min-clip
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-muted text-sm mb-8 relative z-10"
      >
        AI Video Studio
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex items-center gap-3 mb-4">
          {isError ? (
            <AlertTriangle size={20} className="text-[var(--color-danger)]" />
          ) : isReady ? (
            <CheckCircle2 size={20} className="text-[var(--color-success)]" />
          ) : (
            <Loader2 size={20} className="animate-spin text-[var(--color-accent)]" />
          )}
          <div>
            <div className="text-sm font-semibold">{labelFor(status.status)}</div>
            {status.message && <div className="text-xs text-muted mt-0.5">{status.message}</div>}
          </div>
        </div>

        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full"
            style={{
              background: isError
                ? "var(--color-danger)"
                : "var(--gradient-primary)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {isError && (
          <button
            onClick={onRetry}
            className="w-full py-2.5 rounded-lg btn-primary text-sm font-semibold"
          >
            Thử lại
          </button>
        )}

        {logs.length > 0 && (
          <details className="mt-6">
            <summary className="text-xs text-muted cursor-pointer hover:text-text transition-colors">
              Chi tiết kỹ thuật ({logs.length})
            </summary>
            <div className="mt-2 rounded-lg p-3 bg-black/30 border border-[var(--color-border)] max-h-48 overflow-y-auto">
              <pre className="text-[10px] text-muted whitespace-pre-wrap font-mono leading-relaxed">
                {logs.join("\n")}
              </pre>
            </div>
          </details>
        )}
      </motion.div>
    </div>
  );
}

function labelFor(status: AppStatusPayload["status"]): string {
  switch (status) {
    case "starting":
      return "Đang khởi động…";
    case "downloading":
      return "Đang tải dữ liệu cần thiết…";
    case "extracting":
      return "Đang cài đặt…";
    case "spawning-python":
      return "Đang chuẩn bị…";
    case "waiting-ping":
      return "Đang chờ phản hồi từ máy chủ…";
    case "ready":
      return "Sẵn sàng";
    case "error":
      return "Đã xảy ra lỗi";
    default:
      return "";
  }
}