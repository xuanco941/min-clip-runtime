import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Download, X } from "lucide-react";
import { Button } from "./Button";
import { Textarea } from "./Field";

interface Props {
  kind: "video" | "audio";
  /** Gọi sau khi import xong, kèm danh sách tên file đã thêm. */
  onImported: (added: string[]) => void;
}

/** Nút + panel dán link để tải video/nhạc về (qua yt-dlp). */
export function ImportLink({ kind, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [urls, setUrls] = useState("");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const off = window.minclip.events.onYtdlpProgress((p) => {
      setPct(p.percent);
      if (p.message) setStatus(p.message);
      else if (p.phase === "downloading") setStatus("Đang tải về…");
    });
    return off;
  }, []);

  const label = kind === "audio" ? "Thêm nhạc từ link" : "Thêm video từ link";
  const placeholder =
    kind === "audio"
      ? "Dán link YouTube/SoundCloud… (mỗi dòng 1 link)"
      : "Dán link YouTube/TikTok/Facebook… (mỗi dòng 1 link)";

  const run = async () => {
    const list = urls.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) return;
    setBusy(true);
    setErrors([]);
    const added: string[] = [];
    const errs: string[] = [];
    for (let i = 0; i < list.length; i++) {
      setStatus(`(${i + 1}/${list.length}) Đang chuẩn bị…`);
      setPct(null);
      // eslint-disable-next-line no-await-in-loop
      const r = await window.minclip.api.importMedia(kind, list[i]);
      if (r.ok && r.name) added.push(r.name);
      else errs.push(`${list[i].slice(0, 45)} → ${r.error ?? "lỗi"}`);
    }
    setBusy(false);
    setPct(null);
    setStatus("");
    setErrors(errs);
    if (added.length > 0) {
      setUrls("");
      if (errs.length === 0) setOpen(false);
    }
    onImported(added);
  };

  return (
    <div className="relative">
      <Button icon={<Link2 size={14} />} onClick={() => setOpen((o) => !o)}>
        {label}
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 top-full mt-2 z-40 w-[380px] max-w-[90vw] rounded-xl glass-strong p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{label}</div>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-text">
                <X size={14} />
              </button>
            </div>
            <Textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder={placeholder}
              rows={3}
              disabled={busy}
            />
            {busy && (
              <div className="space-y-1">
                <div className="text-xs text-muted">{status}</div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${pct ?? 5}%`, background: "var(--gradient-primary)" }}
                  />
                </div>
              </div>
            )}
            {errors.length > 0 && (
              <div className="text-[11px] text-[var(--color-danger)] space-y-0.5 max-h-24 overflow-y-auto">
                {errors.map((e, i) => (
                  <div key={i}>• {e}</div>
                ))}
              </div>
            )}
            <Button variant="primary" icon={<Download size={13} />} loading={busy} onClick={run}>
              Tải về
            </Button>
            <div className="text-[10px] text-muted">
              Tải bằng yt-dlp. Lần đầu app sẽ tải công cụ (~17MB). Chỉ tải nội dung bạn có quyền sử dụng.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
