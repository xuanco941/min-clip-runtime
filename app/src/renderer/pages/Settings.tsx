import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings as SettingsIcon,
  Key,
  Cpu,
  Database,
  Cloud,
  Mic2,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  Download,
  Github,
  CheckCircle2,
  Heart,
  ExternalLink,
} from "lucide-react";
import { PageHeader, Toast, type ToastKind } from "../components/Toast";
import { Section } from "../components/Section";
import { Field, Input, Select, Toggle } from "../components/Field";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { modelsFor } from "../lib/models";
import type {
  ConfigUpdateInput,
  ConfigValue,
  RuntimeInfo,
  AppUpdateStatusPayload,
} from "../../preload/types";

const LLM_PROVIDERS = [
  "openrouter", "openai", "gemini", "deepseek", "groq", "moonshot", "qwen", "grok",
  "aihubmix", "azure", "modelscope", "ollama", "oneapi",
  "cloudflare", "ernie", "minimax", "mimo", "pollinations", "litellm",
];

type Cfg = Record<string, Record<string, ConfigValue>>;

export default function Settings() {
  const [activeTab, setActiveTab] = useState("llm");
  const [cfg, setCfg] = useState<Cfg>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = useRef<Map<string, ConfigUpdateInput>>(new Map());
  const [toast, setToast] = useState<{ show: boolean; kind: ToastKind; message: string }>({
    show: false,
    kind: "info",
    message: "",
  });
  const [updater, setUpdater] = useState<{ checking: boolean; running: boolean; result: { hasUpdate: boolean; log: string[] } | null }>({
    checking: false,
    running: false,
    result: null,
  });
  const [contract, setContract] = useState<{
    checking: boolean;
    report: Awaited<ReturnType<typeof window.minclip.api.checkContract>> | null;
  }>({ checking: false, report: null });
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [appUpd, setAppUpd] = useState<AppUpdateStatusPayload>({ state: "idle" });

  useEffect(() => {
    window.minclip.api
      .getConfig()
      .then((c) => setCfg(c as Cfg))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
    window.minclip.api.getRuntimeInfo().then(setRuntime).catch(() => undefined);
    const off = window.minclip.events.onAppUpdateStatus(setAppUpd);
    return off;
  }, []);

  const llmProvider = String(get("app", "llm_provider", "openai"));

  function sectionKey(section: string | null): string {
    return section ?? "_top";
  }
  function get(section: string | null, key: string, def: ConfigValue): ConfigValue {
    const s = cfg[sectionKey(section)];
    return s && key in s ? s[key] : def;
  }
  function sval(section: string | null, key: string, def = ""): string {
    const v = get(section, key, def);
    if (Array.isArray(v)) return v.join(", ");
    return String(v ?? "");
  }
  function set(section: string | null, key: string, value: ConfigValue): void {
    const s = sectionKey(section);
    setCfg((prev) => ({ ...prev, [s]: { ...(prev[s] || {}), [key]: value } }));
    dirty.current.set(`${s}.${key}`, { section, key, value });
  }

  const showToast = (kind: ToastKind, message: string) => {
    setToast({ show: true, kind, message });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  };

  async function save() {
    const updates = [...dirty.current.values()];
    if (updates.length === 0) {
      showToast("info", "Không có thay đổi nào");
      return;
    }
    setSaving(true);
    try {
      const r = await window.minclip.api.setConfig(updates);
      dirty.current.clear();
      showToast("success", r.restarted ? "Đã lưu và áp dụng cài đặt" : "Đã lưu cài đặt của bạn");
    } catch (err) {
      showToast("error", `Lưu không thành công: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  type InputExtra = InputHTMLAttributes<HTMLInputElement>;
  // Helper render input chuỗi controlled.
  const strInput = (section: string | null, key: string, props: InputExtra = {}) => (
    <Input
      value={sval(section, key)}
      onChange={(e) => set(section, key, e.target.value)}
      {...props}
    />
  );
  // Input số controlled.
  const numInput = (section: string | null, key: string, def: number, props: InputExtra = {}) => (
    <Input
      type="number"
      value={String(get(section, key, def))}
      onChange={(e) => set(section, key, Number(e.target.value))}
      {...props}
    />
  );
  // Input mảng (chuỗi cách nhau bằng dấu phẩy) controlled.
  const arrInput = (section: string | null, key: string, props: InputExtra = {}) => (
    <Input
      value={sval(section, key)}
      onChange={(e) =>
        set(section, key, e.target.value.split(",").map((x) => x.trim()).filter(Boolean))
      }
      {...props}
    />
  );

  const tabs = [
    { id: "llm", label: "AI viết kịch bản", icon: <Cpu size={14} /> },
    { id: "source", label: "Nguồn video", icon: <ImageIcon size={14} /> },
    { id: "tts", label: "Giọng đọc", icon: <Mic2 size={14} /> },
    { id: "subtitle", label: "Phụ đề", icon: <Key size={14} /> },
    { id: "upload", label: "Đăng tự động", icon: <Cloud size={14} /> },
    { id: "system", label: "Hệ thống", icon: <Database size={14} /> },
  ];

  const SaveButton = () => (
    <Button variant="primary" loading={saving} onClick={save}>
      Lưu
    </Button>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cài đặt"
        subtitle={loaded ? "Thiết lập các tuỳ chọn cho việc tạo video" : "Đang tải…"}
        icon={<SettingsIcon size={20} />}
      />

      <div className="flex flex-wrap gap-1 p-1 rounded-2xl bg-white/[0.02] border border-[var(--color-border)] w-fit">
        {tabs.map((t) => {
          const active = activeTab === t.id;
          return (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveTab(t.id)}
              className={`relative px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
                active ? "text-white" : "text-muted hover:text-text"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: "var(--gradient-primary)" }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {t.icon}
                {t.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "llm" && (
          <motion.div key="llm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
            <Section title="Dịch vụ AI" icon={<Cpu size={14} />} accent>
              <Field label="Nhà cung cấp AI" hint="Dùng để viết kịch bản và từ khoá tự động">
                <Select value={llmProvider} onChange={(e) => set("app", "llm_provider", e.target.value)}>
                  {LLM_PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Field>
            </Section>

            <Section title={`Cấu hình ${llmProvider}`} icon={<Key size={14} />}>
              {llmProvider === "openrouter" && (
                <div
                  className="rounded-lg p-3 text-xs border mb-1"
                  style={{ background: "rgba(34,211,238,0.08)", borderColor: "var(--color-border-strong)" }}
                >
                  OpenRouter có <b>nhiều model FREE</b> (đuôi <code className="px-1 rounded bg-white/5">:free</code>). Lấy API
                  key ở <button type="button" className="text-[var(--color-accent)] hover:underline" onClick={() => window.minclip.api.openExternal("https://openrouter.ai/keys")}>openrouter.ai/keys</button>.
                  Base URL để trống cũng được (tự dùng <code className="px-1 rounded bg-white/5">https://openrouter.ai/api/v1</code>).
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="API Key" hint="Chỉ lưu trên máy bạn, không gửi đi đâu khác">
                  {strInput("app", `${llmProvider}_api_key`, { type: "password", placeholder: "sk-..." })}
                </Field>
                <Field label="Base URL" hint="Để trống nếu dùng mặc định">
                  {strInput("app", `${llmProvider}_base_url`, { placeholder: "https://api.openai.com/v1" })}
                </Field>
                <Field label="Model Name" hint="Chọn gợi ý hoặc tự nhập tên model">
                  <Input
                    list="llm-model-list"
                    value={sval("app", `${llmProvider}_model_name`)}
                    onChange={(e) => set("app", `${llmProvider}_model_name`, e.target.value)}
                    placeholder="gpt-4o-mini"
                  />
                  <datalist id="llm-model-list">
                    {modelsFor(llmProvider).map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </Field>
                {llmProvider === "azure" && (
                  <Field label="API Version">
                    {strInput("app", "azure_api_version", { placeholder: "2024-02-15-preview" })}
                  </Field>
                )}
                {llmProvider === "cloudflare" && (
                  <Field label="Account ID">{strInput("app", "cloudflare_account_id")}</Field>
                )}
                {llmProvider === "ernie" && (
                  <Field label="Secret Key">{strInput("app", "ernie_secret_key", { type: "password" })}</Field>
                )}
              </div>
              <SaveButton />
            </Section>
          </motion.div>
        )}

        {activeTab === "source" && (
          <motion.div key="source" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Section title="API key cho nguồn video" icon={<Key size={14} />}>
              <div className="space-y-4">
                <Field label="Pexels API Key" hint="Có thể nhập nhiều key, cách nhau bằng dấu phẩy">
                  {arrInput("app", "pexels_api_keys", { type: "password" })}
                </Field>
                <Field label="Pixabay API Key" hint="Có thể nhập nhiều key, cách nhau bằng dấu phẩy">
                  {arrInput("app", "pixabay_api_keys", { type: "password" })}
                </Field>
                <Field label="Coverr API Key" hint="Có thể nhập nhiều key, cách nhau bằng dấu phẩy">
                  {arrInput("app", "coverr_api_keys", { type: "password" })}
                </Field>
              </div>
              <SaveButton />
            </Section>
          </motion.div>
        )}

        {activeTab === "tts" && (
          <motion.div key="tts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Section title="Giọng đọc" icon={<Mic2 size={14} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Azure Speech Region">{strInput("azure", "speech_region", { placeholder: "eastasia" })}</Field>
                <Field label="Azure Speech Key">{strInput("azure", "speech_key", { type: "password" })}</Field>
                <Field label="SiliconFlow API Key">{strInput("siliconflow", "api_key", { type: "password" })}</Field>
                <Field label="Subtitle provider">
                  <Select value={sval("app", "subtitle_provider", "edge")} onChange={(e) => set("app", "subtitle_provider", e.target.value)}>
                    <option value="edge">edge (Azure TTS V1)</option>
                    <option value="whisper">whisper (cần model local)</option>
                  </Select>
                </Field>
              </div>
              <SaveButton />
            </Section>
          </motion.div>
        )}

        {activeTab === "subtitle" && (
          <motion.div key="subtitle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Section title="Whisper (phụ đề nâng cao)" icon={<Key size={14} />}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Model">
                  <Select value={sval("whisper", "model_size", "large-v3")} onChange={(e) => set("whisper", "model_size", e.target.value)}>
                    {["tiny", "base", "small", "medium", "large-v3"].map((m) => <option key={m}>{m}</option>)}
                  </Select>
                </Field>
                <Field label="Device">
                  <Select value={sval("whisper", "device", "CPU")} onChange={(e) => set("whisper", "device", e.target.value)}>
                    <option value="CPU">CPU</option>
                    <option value="cuda">CUDA (GPU)</option>
                  </Select>
                </Field>
                <Field label="Compute type">
                  <Select value={sval("whisper", "compute_type", "int8")} onChange={(e) => set("whisper", "compute_type", e.target.value)}>
                    {["int8", "int8_float16", "float16", "float32"].map((m) => <option key={m}>{m}</option>)}
                  </Select>
                </Field>
              </div>
              <SaveButton />
            </Section>
          </motion.div>
        )}

        {activeTab === "upload" && (
          <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Section title="Upload-Post (TikTok/Instagram)" icon={<Cloud size={14} />}>
              <Toggle
                checked={Boolean(get("ui", "upload_post_enabled", false))}
                onChange={(v) => set("ui", "upload_post_enabled", v)}
                label="Bật tự động đăng sau khi tạo video"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Field label="API Key">{strInput("ui", "upload_post_api_key", { type: "password" })}</Field>
                <Field label="Username">{strInput("ui", "upload_post_username")}</Field>
                <Field label="Nền tảng" hint="Cách nhau bằng dấu phẩy: tiktok, instagram, youtube">
                  {arrInput("ui", "upload_post_platforms", { placeholder: "tiktok, instagram" })}
                </Field>
              </div>
              <SaveButton />
            </Section>
          </motion.div>
        )}

        {activeTab === "system" && (
          <motion.div key="system" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
            <Section title="Giới thiệu" icon={<Heart size={14} />} accent>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted">Giá:</span>
                <span className="font-semibold">🎉 Miễn phí 100%</span>
              </div>
              <p className="text-xs text-muted">
                min-clip là phần mềm miễn phí. Bạn có thể dùng thoải mái không giới hạn.
              </p>
              <div className="text-sm">
                Thiết kế bởi <b className="text-text">Đỗ Văn Xuân</b>
              </div>
              <Button
                icon={<ExternalLink size={14} />}
                onClick={() => window.minclip.api.openExternal("https://www.facebook.com/xuanco941/")}
              >
                Facebook: xuanco941
              </Button>
            </Section>

            <Section title="Cập nhật ứng dụng (min-clip)" icon={<Download size={14} />} accent>
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <div className="text-xs text-muted">Đang dùng</div>
                  <div className="text-lg font-mono font-semibold mt-1">{appUpd.currentVersion ?? runtime?.expected ?? "—"}</div>
                </Card>
                <Card>
                  <div className="text-xs text-muted">Bản mới</div>
                  <div className="text-lg font-mono font-semibold mt-1">{appUpd.version ?? "—"}</div>
                </Card>
                <Card>
                  <div className="text-xs text-muted">Trạng thái</div>
                  <div className="text-sm font-semibold mt-1">{appUpdateLabel(appUpd)}</div>
                </Card>
              </div>

              {appUpd.state === "downloading" && (
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${appUpd.percent ?? 0}%`, background: "var(--gradient-primary)" }} />
                </div>
              )}
              {appUpd.message && <p className="text-xs text-muted">{appUpd.message}</p>}

              <div className="flex gap-2 flex-wrap">
                <Button
                  loading={appUpd.state === "checking"}
                  icon={<RefreshCw size={14} />}
                  onClick={async () => {
                    const r = await window.minclip.api.checkAppUpdate();
                    if (r.state === "not-available") showToast("success", "Đang dùng bản mới nhất");
                    else if (r.state === "available") showToast("info", `Có bản mới: ${r.version}`);
                  }}
                >
                  Kiểm tra cập nhật
                </Button>
                <Button
                  variant="primary"
                  icon={<Download size={14} />}
                  disabled={appUpd.state !== "available"}
                  loading={appUpd.state === "downloading"}
                  onClick={() => window.minclip.api.downloadAppUpdate()}
                >
                  Tải bản mới
                </Button>
                <Button
                  icon={<RefreshCw size={14} />}
                  disabled={appUpd.state !== "downloaded"}
                  onClick={() => window.minclip.api.installAppUpdate()}
                >
                  Cài &amp; khởi động lại
                </Button>
              </div>
            </Section>

            <Section title="Dữ liệu xử lý video" icon={<Download size={14} />}>
              <p className="text-xs text-muted">
                Đây là bộ công cụ min-clip dùng để dựng video. Nếu gặp trục trặc, bạn có thể tải lại — video và
                cài đặt của bạn vẫn được giữ nguyên.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted">Trạng thái:</span>
                <span className="font-semibold">
                  {runtime?.devApiDir ? "Chế độ thử nghiệm" : runtime?.ready ? "✅ Sẵn sàng" : "Chưa sẵn sàng"}
                </span>
              </div>
              <Button
                icon={<RefreshCw size={14} />}
                disabled={Boolean(runtime?.devApiDir)}
                onClick={async () => {
                  try {
                    await window.minclip.api.resetRuntime();
                    showToast("info", "Đã ghi nhận — mở lại app để tải lại dữ liệu xử lý");
                  } catch (err) {
                    showToast("error", `Không thực hiện được: ${(err as Error).message}`);
                  }
                }}
              >
                Tải lại dữ liệu xử lý
              </Button>
            </Section>

            <Section title="Hệ thống" icon={<Database size={14} />}>
              <Field label="Số video xử lý cùng lúc" hint="Nhiều hơn sẽ nhanh hơn nhưng tốn tài nguyên máy hơn">
                {numInput("app", "max_concurrent_tasks", 5)}
              </Field>
              <div className="flex gap-2">
                <SaveButton />
                <Button
                  onClick={async () => {
                    await window.minclip.api.restart();
                    showToast("info", "Đang khởi động lại bộ xử lý…");
                  }}
                >
                  Khởi động lại bộ xử lý
                </Button>
              </div>

              <Section title="Nâng cao (cho người dùng kỹ thuật)" collapsible defaultOpen={false}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Địa chỉ máy chủ" hint="Để mặc định nếu không chắc">{strInput(null, "listen_host", { placeholder: "127.0.0.1" })}</Field>
                  <Field label="Cổng" hint="App tự đổi nếu cổng bận">{numInput(null, "listen_port", 8080)}</Field>
                  <Field label="Số tác vụ chờ tối đa">{numInput("app", "max_queued_tasks", 100)}</Field>
                  <Field label="Đường dẫn FFmpeg" hint="Để trống — app tự cấu hình">{strInput("app", "ffmpeg_path")}</Field>
                  <Field label="Đường dẫn ImageMagick" hint="Để trống — app tự cấu hình">{strInput("app", "imagemagick_path")}</Field>
                </div>
                <SaveButton />
              </Section>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast kind={toast.kind} message={toast.message} show={toast.show} onClose={() => setToast((t) => ({ ...t, show: false }))} />
    </div>
  );
}

function appUpdateLabel(s: AppUpdateStatusPayload): string {
  switch (s.state) {
    case "idle": return "Chưa kiểm tra";
    case "checking": return "Đang kiểm tra…";
    case "available": return "Có bản mới";
    case "not-available": return "Mới nhất";
    case "downloading": return `Đang tải ${s.percent ?? 0}%`;
    case "downloaded": return "Đã tải — sẵn sàng cài";
    case "error": return "Lỗi";
    default: return "";
  }
}

function ContractBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="chip text-[10px]" style={{ background: "rgba(16,185,129,0.15)", color: "rgb(16,185,129)" }}>
      <CheckCircle2 size={10} /> Tương thích
    </span>
  ) : (
    <span className="chip text-[10px]" style={{ background: "rgba(244,63,94,0.15)", color: "rgb(244,63,94)" }}>
      <AlertCircle size={10} /> Cần cập nhật
    </span>
  );
}
