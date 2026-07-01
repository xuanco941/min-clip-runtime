import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Upload, Trash2, Loader2, Film, Image as ImageIcon, X } from "lucide-react";
import { PageHeader, Toast, type ToastKind } from "../components/Toast";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SkeletonGrid } from "../components/Skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useMaterialList, useUploadMaterial } from "../lib/store";
import { ImportLink } from "../components/ImportLink";
import { formatBytes } from "../lib/utils";

export default function Materials() {
  const { data, isLoading } = useMaterialList();
  const upload = useUploadMaterial();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
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

  const files = data?.files ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Materials"
        subtitle="Video & ảnh nguồn cho chế độ 'File local'"
        icon={<FolderOpen size={20} />}
      >
        <ImportLink
          kind="video"
          onImported={(added) => {
            if (added.length) {
              qc.invalidateQueries({ queryKey: ["materials"] });
              showToast("success", `Đã thêm ${added.length} video từ link`);
            }
          }}
        />
        <Button
          variant="primary"
          icon={<Upload size={14} />}
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          Upload file
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".mp4,.mov,.avi,.flv,.mkv,.jpg,.jpeg,.png,.MP4,.MOV,.AVI,.FLV,.MKV,.JPG,.JPEG,.PNG"
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
        />
      </PageHeader>

      {isLoading ? (
        <SkeletonGrid count={8} />
      ) : files.length === 0 ? (
        <Card
          className="text-center border-dashed cursor-pointer hover:border-[var(--color-border-strong)] transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <EmptyState
            icon={<Upload size={32} />}
            title="Kéo thả hoặc bấm để upload"
            description="Hỗ trợ mp4, mov, avi, flv, mkv, jpg, jpeg, png"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {files.map((f, i) => {
            const isImage = /\.(jpe?g|png)$/i.test(f.name);
            return (
              <motion.div
                key={f.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                whileHover={{ y: -2 }}
              >
                <Card hover className="p-2 group">
                  <div
                    onClick={() => setPreview(f.name)}
                    className="aspect-square rounded-lg bg-gradient-to-br from-[var(--color-accent)]/15 to-[var(--color-accent-3)]/15 flex items-center justify-center cursor-pointer relative overflow-hidden border border-[var(--color-border)]"
                  >
                    {isImage ? (
                      <ImageIcon size={28} className="text-muted" />
                    ) : (
                      <Film size={28} className="text-muted" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs text-white">Xem</span>
                    </div>
                  </div>
                  <div className="px-1 pt-2">
                    <div className="text-[11px] font-medium truncate" title={f.name}>
                      {f.name}
                    </div>
                    <div className="text-[10px] text-muted">{formatBytes(f.size)}</div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreview(null)}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white"
              onClick={() => setPreview(null)}
            >
              <X size={20} />
            </button>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl glass-strong p-6 max-w-2xl w-full"
            >
              <div className="text-sm font-semibold mb-3">{preview}</div>
              <div className="aspect-video rounded-xl bg-black flex items-center justify-center">
                <Film size={48} className="text-muted" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast
        kind={toast.kind}
        message={toast.message}
        show={toast.show}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
    </div>
  );
}