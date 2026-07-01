import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Music, Upload, Play, Pause, Search } from "lucide-react";
import { PageHeader, Toast, type ToastKind } from "../components/Toast";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SkeletonCard } from "../components/Skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore, useBgmList, useUploadBgm } from "../lib/store";
import { ImportLink } from "../components/ImportLink";
import { formatBytes } from "../lib/utils";

export default function BGM() {
  const { data, isLoading } = useBgmList();
  const upload = useUploadBgm();
  const qc = useQueryClient();
  const baseUrl = useAppStore((s) => s.baseUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ show: boolean; kind: ToastKind; message: string }>({
    show: false,
    kind: "info",
    message: "",
  });

  const showToast = (kind: ToastKind, message: string) => {
    setToast({ show: true, kind, message });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await upload.mutateAsync(file);
      }
      showToast("success", `Đã upload ${files.length} file`);
    } catch (err) {
      showToast("error", `Lỗi: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const allFiles = data?.files ?? [];
  const files = allFiles.filter((f) =>
    search ? f.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  // Phát qua custom protocol minclip-media:// (file nhạc nằm ở resource/songs,
  // không có endpoint HTTP để stream).
  const previewUrl = (name: string) => `minclip-media://songs/${encodeURIComponent(name)}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nhạc nền"
        subtitle="Thư viện BGM dùng khi tạo video"
        icon={<Music size={20} />}
      >
        <ImportLink
          kind="audio"
          onImported={(added) => {
            if (added.length) {
              qc.invalidateQueries({ queryKey: ["bgm"] });
              showToast("success", `Đã thêm ${added.length} bài từ link`);
            }
          }}
        />
        <Button
          variant="primary"
          icon={<Upload size={14} />}
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          Upload MP3
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".mp3,.MP3"
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
        />
      </PageHeader>

      {allFiles.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Search size={14} className="text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên file…"
              className="flex-1 bg-transparent outline-none text-sm"
            />
            <span className="text-xs text-muted">{files.length}/{allFiles.length}</span>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : allFiles.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Music size={32} />}
            title="Chưa có file nhạc nền"
            description="Upload MP3 để dùng làm nhạc nền cho video"
            action={
              <Button variant="primary" onClick={() => inputRef.current?.click()}>
                Upload MP3
              </Button>
            }
          />
        </Card>
      ) : files.length === 0 ? (
        <Card>
          <div className="py-6 text-center text-sm text-muted">Không tìm thấy file phù hợp.</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {files.map((f, i) => (
            <motion.div
              key={f.name}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card hover className="flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPlaying(playing === f.name ? null : f.name)}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {playing === f.name ? <Pause size={16} /> : <Play size={16} fill="white" />}
                </motion.button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{f.name}</div>
                  <div className="text-[10px] text-muted mt-0.5">{formatBytes(f.size)}</div>
                </div>
                {playing === f.name && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-end gap-0.5 h-6"
                  >
                    {[0, 1, 2, 3].map((b) => (
                      <motion.div
                        key={b}
                        className="w-0.5 rounded-full bg-[var(--color-accent)]"
                        animate={{ height: ["20%", "100%", "40%"] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: b * 0.1 }}
                      />
                    ))}
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {playing && (
        <audio
          src={previewUrl(playing)}
          autoPlay
          onEnded={() => setPlaying(null)}
          className="hidden"
        />
      )}

      <Toast
        kind={toast.kind}
        message={toast.message}
        show={toast.show}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
    </div>
  );
}