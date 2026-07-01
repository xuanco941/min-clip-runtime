import { motion } from "framer-motion";
import { Sparkles, Wand2, Info, AlertTriangle, Settings as SettingsIcon, Upload, Volume2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, type ToastKind } from "../components/Toast";
import { pushToast } from "../lib/toast-store";
import { Section } from "../components/Section";
import { Field, Input, Textarea, Select, Toggle } from "../components/Field";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { SearchSelect } from "../components/SearchSelect";
import { ImportLink } from "../components/ImportLink";
import { getVoices } from "../lib/voices";
import { formatBytes } from "../lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateVideo,
  useGenerateScript,
  useGenerateTerms,
  useUploadMaterial,
  useMaterialList,
  useBgmList,
  useUploadBgm,
} from "../lib/store";
import type {
  LlmProvider,
  TtsServer,
  VideoAspect,
  VideoConcatMode,
  VideoParams,
  VideoSource,
  VideoTransitionMode,
} from "../lib/api-types";

const SCRIPT_LANGS: Array<{ code: string; label: string }> = [
  { code: "vi-VN", label: "Tiếng Việt" },
  { code: "en-US", label: "English (US)" },
  { code: "zh-CN", label: "中文 (简体)" },
  { code: "zh-HK", label: "中文 (香港)" },
  { code: "zh-TW", label: "中文 (台灣)" },
  { code: "de-DE", label: "Deutsch" },
  { code: "fr-FR", label: "Français" },
  { code: "ru-RU", label: "Русский" },
  { code: "th-TH", label: "ภาษาไทย" },
  { code: "tr-TR", label: "Türkçe" },
  { code: "", label: "Tự động phát hiện" }

];

// Chỉ liệt kê các nguồn backend THỰC SỰ hỗ trợ (pexels/pixabay/coverr/local).
// douyin/bilibili/xiaohongshu chưa được MoneyPrinterTurbo cài đặt (sẽ tự rơi về
// Pexels) nên không đưa vào để tránh gây hiểu nhầm.
const VIDEO_SOURCES: Array<{ value: VideoSource; label: string; hint: string }> = [
  { value: "pexels", label: "Pexels", hint: "Video stock chất lượng cao" },
  { value: "pixabay", label: "Pixabay", hint: "Kho video miễn phí" },
  { value: "coverr", label: "Coverr", hint: "Video cinematic 16:9" },
  { value: "local", label: "File local", hint: "Dùng video bạn đã upload" },
];

const TRANSITION_MODES: Array<{ value: VideoTransitionMode; label: string }> = [
  { value: "None", label: "Không" },
  { value: "Shuffle", label: "Trộn ngẫu nhiên" },
  { value: "FadeIn", label: "Mờ dần vào" },
  { value: "FadeOut", label: "Mờ dần ra" },
  { value: "SlideIn", label: "Trượt vào" },
  { value: "SlideOut", label: "Trượt ra" },
];

const LLM_PROVIDERS: Array<{ value: LlmProvider; label: string; recommend?: boolean }> = [
  { value: "openai", label: "OpenAI" },
  { value: "aihubmix", label: "AIHubMix", recommend: true },
  { value: "moonshot", label: "Moonshot" },
  { value: "azure", label: "Azure" },
  { value: "qwen", label: "Qwen (通义千问)" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "modelscope", label: "ModelScope" },
  { value: "gemini", label: "Gemini" },
  { value: "grok", label: "Grok" },
  { value: "groq", label: "Groq" },
  { value: "ollama", label: "Ollama" },
  { value: "oneapi", label: "OneAPI" },
  { value: "cloudflare", label: "Cloudflare" },
  { value: "ernie", label: "ERNIE (文心一言)" },
  { value: "minimax", label: "MiniMax" },
  { value: "mimo", label: "MiMo" },
  { value: "pollinations", label: "Pollinations" },
  { value: "litellm", label: "LiteLLM" },
];

const TTS_SERVERS: Array<{ value: TtsServer; label: string }> = [
  { value: "valtec", label: "Tiếng Việt (local, miễn phí) — nhiều giọng" },
  { value: "NO_VOICE", label: "Không dùng giọng đọc" },
  { value: "azure-tts-v1", label: "Azure TTS V1" },
  { value: "azure-tts-v2", label: "Azure TTS V2" },
  { value: "siliconflow", label: "SiliconFlow TTS" },
  { value: "gemini-tts", label: "Google Gemini TTS" },
  { value: "mimo-tts", label: "Xiaomi MiMo TTS" },
];

const DEFAULT_PARAMS: VideoParams = {
  video_subject: "",
  video_script: "",
  video_terms: "",
  video_aspect: "9:16",
  video_concat_mode: "random",
  video_transition_mode: "None",
  video_clip_duration: 3,
  video_count: 1,
  video_source: "pexels",
  video_language: "vi-VN",
  voice_name: "",
  voice_volume: 1.0,
  voice_rate: 1.0,
  bgm_type: "random",
  bgm_file: "",
  bgm_volume: 0.2,
  subtitle_enabled: true,
  subtitle_position: "bottom",
  custom_position: 70.0,
  font_name: "MicrosoftYaHeiBold.ttc",
  text_fore_color: "#FFFFFF",
  text_background_color: true,
  rounded_subtitle_background: false,
  font_size: 60,
  stroke_color: "#000000",
  stroke_width: 1.5,
  n_threads: 2,
  paragraph_number: 1,
  video_script_prompt: "",
  custom_system_prompt: "",
  llm_provider: "openai",
  tts_server: "azure-tts-v1",
};

// Provider LLM không cần API key.
const LLM_NO_KEY = ["ollama", "pollinations", "g4f"];

type ConfigShape = Record<string, Record<string, unknown>>;

/** Trả về danh sách thiết lập bắt buộc còn thiếu để tạo video. */
function computeMissingConfig(cfg: ConfigShape, params: VideoParams): string[] {
  const missing: string[] = [];
  const app = cfg.app || {};
  const provider = String(app.llm_provider || params.llm_provider || "openai");
  if (!LLM_NO_KEY.includes(provider)) {
    const key = app[`${provider}_api_key`];
    if (!key || (typeof key === "string" && !key.trim())) {
      missing.push(`Khoá API LLM (${provider})`);
    }
  }
  const src = String(params.video_source ?? "");
  if (["pexels", "pixabay", "coverr"].includes(src)) {
    const keys = app[`${src}_api_keys`];
    const has = Array.isArray(keys) ? keys.length > 0 : !!String(keys || "").trim();
    if (!has) missing.push(`Khoá API nguồn video (${src})`);
  }
  return missing;
}

export default function Home() {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<ConfigShape>({});
  const [params, setParams] = useState<VideoParams>(DEFAULT_PARAMS);
  const [advancedScript, setAdvancedScript] = useState(false);
  const [advancedVideo, setAdvancedVideo] = useState(false);
  const [bgmType, setBgmType] = useState<"none" | "random" | "custom">("random");
  const [localFiles, setLocalFiles] = useState<File[]>([]);

  // Mọi thông báo đi qua toast store toàn cục (ToastHost render trong App).
  const showToast = (kind: ToastKind, message: string) => pushToast(kind, message);

  const update = <K extends keyof VideoParams>(key: K, value: VideoParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    window.minclip.api.getConfig().then((c) => setCfg(c as ConfigShape)).catch(() => undefined);
  }, []);

  const missing = computeMissingConfig(cfg, params);

  const genScript = useGenerateScript();
  const genTerms = useGenerateTerms();
  const createVideo = useCreateVideo();
  const uploadMaterial = useUploadMaterial();
  const qcHome = useQueryClient();
  const { data: materialsData } = useMaterialList();
  const materialFiles = materialsData?.files ?? [];
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const toggleMaterial = (name: string) =>
    setSelectedMaterials((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));
  const { data: bgmData } = useBgmList();
  const uploadBgm = useUploadBgm();
  const [uploadingSong, setUploadingSong] = useState(false);
  const bgmOptions = (bgmData?.files ?? []).map((f) => ({
    value: f.name,
    label: f.name,
    hint: formatBytes(f.size),
  }));

  // Upload 1 file mp3 vào kho nhạc (dùng chung cho nhạc nền & giọng đọc tuỳ chỉnh).
  const handleUploadSong = async (file: File | null): Promise<string | null> => {
    if (!file) return null;
    setUploadingSong(true);
    try {
      const r = await uploadBgm.mutateAsync(file);
      showToast("success", `Đã thêm "${r.file}" vào kho nhạc`);
      return r.file;
    } catch (err) {
      showToast("error", `Tải lên lỗi: ${(err as Error).message}`);
      return null;
    } finally {
      setUploadingSong(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!params.video_subject) {
      showToast("error", "Vui lòng nhập chủ đề video");
      return;
    }
    try {
      const res = await genScript.mutateAsync({
        video_subject: params.video_subject,
        video_language: params.video_language,
        paragraph_number: params.paragraph_number,
        video_script_prompt: params.video_script_prompt,
        custom_system_prompt: params.custom_system_prompt,
      });
      update("video_script", res.video_script);
      showToast("success", "Đã tạo kịch bản");
    } catch (err) {
      showToast("error", `Lỗi: ${(err as Error).message}`);
    }
  };

  const handleGenerateTerms = async () => {
    if (!params.video_script) {
      showToast("error", "Cần có kịch bản trước");
      return;
    }
    try {
      const res = await genTerms.mutateAsync({
        video_subject: params.video_subject,
        video_script: params.video_script,
      });
      update("video_terms", res.video_terms.join(", "));
      showToast("success", `Đã tạo ${res.video_terms.length} từ khoá`);
    } catch (err) {
      showToast("error", `Lỗi: ${(err as Error).message}`);
    }
  };

  const handleGenerate = async () => {
    if (!params.video_subject && !params.video_script) {
      showToast("error", "Cần nhập chủ đề hoặc kịch bản");
      return;
    }
    if (params.video_source === "local" && localFiles.length === 0 && selectedMaterials.length === 0) {
      showToast("error", "Chọn ít nhất 1 video (từ thư viện, upload, hoặc link)");
      return;
    }
    if (params.tts_server !== "NO_VOICE" && !params.voice_name) {
      showToast("error", "Hãy chọn giọng đọc trước khi tạo video");
      return;
    }
    const miss = computeMissingConfig(cfg, params);
    if (miss.length > 0) {
      showToast("error", `Chưa cấu hình: ${miss.join(", ")}. Mở Cài đặt để thiết lập trước.`);
      navigate("/settings");
      return;
    }
    try {
      // Với nguồn "local": upload file lên trước (API chỉ chấp nhận tên file
      // trong thư mục material của nó, KHÔNG đọc được đường dẫn trên máy bạn),
      // rồi tham chiếu theo tên file trả về.
      let materials: VideoParams["video_materials"] = null;
      if (params.video_source === "local") {
        const names = new Set<string>(selectedMaterials);
        if (localFiles.length) {
          showToast("info", "Đang tải video của bạn lên…");
          for (const f of localFiles) {
            const r = await uploadMaterial.mutateAsync(f);
            names.add(r.file);
          }
        }
        materials = [...names].map((n) => ({ provider: "local" as const, url: n, duration: 0 }));
      }
      const body: VideoParams = {
        ...params,
        // Chế độ "Không dùng giọng đọc": backend chỉ nhận sentinel "no-voice"
        // (chuỗi rỗng bị coi là lỗi cấu hình → tạo audio im lặng, không phải fail).
        voice_name: params.tts_server === "NO_VOICE" ? "no-voice" : params.voice_name,
        bgm_type: bgmType === "none" ? "" : bgmType,
        video_materials: materials,
      };
      const res = await createVideo.mutateAsync(body);
      showToast("success", `Đã tạo tác vụ ${res.task_id.slice(0, 8)}…`);
    } catch (err) {
      showToast("error", `Lỗi: ${(err as Error).message}`);
    }
  };

  const voiceDisabled = params.tts_server === "NO_VOICE";
  const sourceLocal = params.video_source === "local";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tạo video AI"
        subtitle="Biến ý tưởng thành video ngắn chỉ trong vài phút"
        icon={<Wand2 size={20} />}
      >
        <Button
          variant="primary"
          size="lg"
          loading={createVideo.isPending}
          icon={<Sparkles size={16} />}
          onClick={handleGenerate}
        >
          Tạo video ngay
        </Button>
      </PageHeader>

      {missing.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 flex items-center gap-3 border"
          style={{
            background: "rgba(251, 191, 36, 0.10)",
            borderColor: "rgba(251, 191, 36, 0.35)",
          }}
        >
          <AlertTriangle size={18} className="text-[var(--color-warn)] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Cần thiết lập trước khi tạo video</div>
            <div className="text-xs text-muted mt-0.5">Còn thiếu: {missing.join(", ")}.</div>
          </div>
          <Button size="sm" icon={<SettingsIcon size={13} />} onClick={() => navigate("/settings")}>
            Mở Cài đặt
          </Button>
        </motion.div>
      )}

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-7 space-y-5">
          <ScriptSection
            params={params}
            update={update}
            advanced={advancedScript}
            setAdvanced={setAdvancedScript}
            onGenerateScript={handleGenerateScript}
            onGenerateTerms={handleGenerateTerms}
            generatingScript={genScript.isPending}
            generatingTerms={genTerms.isPending}
          />

          <Section
            title="Cài đặt video"
            icon={<span className="text-base">🎬</span>}
            badge={<span className="chip chip-accent">Bắt buộc</span>}
          >
            <Field label="Nguồn video">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {VIDEO_SOURCES.map((src) => {
                  const active = params.video_source === src.value;
                  return (
                    <motion.button
                      key={src.value}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => update("video_source", src.value)}
                      className={`p-3 rounded-xl text-left border transition-all ${active
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                          : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                        }`}
                    >
                      <div className="text-sm font-semibold">{src.label}</div>
                      <div className="text-[10px] text-muted mt-0.5">{src.hint}</div>
                    </motion.button>
                  );
                })}
              </div>
            </Field>

            {sourceLocal && (
              <Field label="Chọn video/ảnh nguồn" hint="Tick chọn từ thư viện, upload, hoặc thêm từ link">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <ImportLink
                    kind="video"
                    onImported={(added) => {
                      if (added.length) {
                        qcHome.invalidateQueries({ queryKey: ["materials"] });
                        setSelectedMaterials((s) => [...new Set([...s, ...added])]);
                      }
                    }}
                  />
                  <input
                    type="file"
                    multiple
                    accept=".mp4,.mov,.avi,.flv,.mkv,.jpg,.jpeg,.png,.MP4,.MOV,.AVI,.FLV,.MKV,.JPG,.JPEG,.PNG"
                    onChange={(e) => setLocalFiles(Array.from(e.target.files ?? []))}
                    className="input file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-accent)]/20 file:text-[var(--color-accent)] file:px-3 file:py-1.5 file:text-xs file:font-medium flex-1 min-w-[180px]"
                  />
                </div>
                {localFiles.length > 0 && (
                  <div className="text-xs text-muted mb-2">Sẽ upload {localFiles.length} file mới</div>
                )}
                {materialFiles.length === 0 ? (
                  <div className="text-xs text-muted">Thư viện trống — thêm video từ link hoặc upload, hoặc vào trang Materials.</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-52 overflow-y-auto">
                    {materialFiles.map((f) => {
                      const on = selectedMaterials.includes(f.name);
                      return (
                        <button
                          key={f.name}
                          type="button"
                          onClick={() => toggleMaterial(f.name)}
                          className={`p-2 rounded-lg text-left border text-[11px] truncate transition-all ${
                            on
                              ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                              : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                          }`}
                          title={f.name}
                        >
                          {on ? "✓ " : ""}
                          {f.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedMaterials.length > 0 && (
                  <div className="text-xs text-[var(--color-accent)] mt-1">Đã chọn {selectedMaterials.length} từ thư viện</div>
                )}
              </Field>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Chế độ ghép">
                <Select
                  value={params.video_concat_mode}
                  onChange={(e) => update("video_concat_mode", e.target.value as VideoConcatMode)}
                >
                  <option value="random">Ngẫu nhiên</option>
                  <option value="sequential">Tuần tự</option>
                </Select>
              </Field>
              <Field label="Hiệu ứng chuyển cảnh">
                <Select
                  value={params.video_transition_mode || "None"}
                  onChange={(e) =>
                    update("video_transition_mode", e.target.value as VideoTransitionMode)
                  }
                >
                  {TRANSITION_MODES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tỉ lệ khung hình">
                <Select
                  value={params.video_aspect}
                  onChange={(e) => update("video_aspect", e.target.value as VideoAspect)}
                >
                  <option value="9:16">9:16 — Dọc (TikTok, Reels)</option>
                  <option value="16:9">16:9 — Ngang (YouTube)</option>
                  <option value="1:1">1:1 — Vuông (Instagram)</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label={`Thời lượng mỗi clip: ${params.video_clip_duration}s`}>
                <input
                  type="range"
                  min={2}
                  max={10}
                  value={params.video_clip_duration}
                  onChange={(e) => update("video_clip_duration", Number(e.target.value))}
                />
              </Field>
              <Field label={`Số video tạo cùng lúc: ${params.video_count}`}>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={params.video_count}
                  onChange={(e) => update("video_count", Number(e.target.value))}
                />
              </Field>
              <Field label="Tốc độ xử lý" hint="Cao hơn = nhanh hơn nhưng tốn máy hơn">
                <Input
                  type="number"
                  min={1}
                  max={16}
                  value={params.n_threads}
                  onChange={(e) => update("n_threads", Number(e.target.value))}
                />
              </Field>
            </div>

            <Section title="Nâng cao" collapsible defaultOpen={false}>
              <Field
                label="Bộ mã hoá video"
                hint="libx264 an toàn nhất. NVENC/AMF/QSV cho phần cứng hỗ trợ."
              >
                <Select
                  value={(params as { video_codec?: string }).video_codec || "libx264"}
                  onChange={(e) => update("video_codec" as keyof VideoParams, e.target.value as never)}
                >
                  <option value="libx264">libx264 (CPU)</option>
                  <option value="h264_nvenc">h264_nvenc (NVIDIA)</option>
                  <option value="h264_amf">h264_amf (AMD)</option>
                  <option value="h264_qsv">h264_qsv (Intel)</option>
                  <option value="h264_mf">h264_mf (Windows MF)</option>
                  <option value="h264_videotoolbox">h264_videotoolbox (macOS)</option>
                </Select>
              </Field>
            </Section>
          </Section>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-5">
          <AudioSection
            params={params}
            update={update}
            bgmType={bgmType}
            setBgmType={setBgmType}
            voiceDisabled={voiceDisabled}
            bgmOptions={bgmOptions}
            onUploadSong={handleUploadSong}
            uploadingSong={uploadingSong}
          />
          <SubtitleSection params={params} update={update} />
        </div>
      </div>

      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-3)] text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold">Sẵn sàng tạo video</div>
            <div className="text-xs text-muted">Bấm để bắt đầu quy trình tạo video AI</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Info size={14} className="text-muted" />
          <span className="text-xs text-muted">
            Tác vụ sẽ xuất hiện trong trang "Tác vụ"
          </span>
        </div>
      </Card>
    </div>
  );
}

function ScriptSection({
  params,
  update,
  advanced,
  setAdvanced,
  onGenerateScript,
  onGenerateTerms,
  generatingScript,
  generatingTerms,
}: {
  params: VideoParams;
  update: <K extends keyof VideoParams>(key: K, value: VideoParams[K]) => void;
  advanced: boolean;
  setAdvanced: (v: boolean) => void;
  onGenerateScript: () => void;
  onGenerateTerms: () => void;
  generatingScript: boolean;
  generatingTerms: boolean;
}) {
  return (
    <Section
      title="Kịch bản video"
      icon={<span className="text-base">📝</span>}
      badge={
        params.video_script ? <span className="chip chip-accent">Đã có kịch bản</span> : null
      }
    >
      <Field label="Chủ đề video">
        <Input
          value={params.video_subject}
          onChange={(e) => update("video_subject", e.target.value)}
          placeholder="VD: Khám phá Đà Lạt mùa hoa anh đào"
        />
      </Field>
      <Field label="Ngôn ngữ kịch bản">
        <Select
          value={params.video_language}
          onChange={(e) => update("video_language", e.target.value)}
        >
          {SCRIPT_LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </Select>
      </Field>

      <Section
        title="Tuỳ chọn nâng cao"
        collapsible
        defaultOpen={advanced}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={`Số đoạn văn: ${params.paragraph_number}`}>
            <input
              type="range"
              min={1}
              max={10}
              value={params.paragraph_number}
              onChange={(e) => update("paragraph_number", Number(e.target.value))}
            />
          </Field>
          <Field label="Dùng system prompt tuỳ chỉnh">
            <Toggle
              checked={!!(params as { use_custom_system_prompt?: boolean }).use_custom_system_prompt}
              onChange={(v) => update("use_custom_system_prompt" as keyof VideoParams, v as never)}
            />
          </Field>
        </div>
        <Field label="Yêu cầu kịch bản tuỳ chỉnh" hint="Tối đa 2000 ký tự">
          <Textarea
            value={params.video_script_prompt}
            onChange={(e) => update("video_script_prompt", e.target.value)}
            placeholder="VD: Giọng văn trẻ trung, hài hước, tập trung vào đồ ăn đường phố..."
            rows={3}
          />
        </Field>
      </Section>

      <div className="flex gap-2">
        <Button
          variant="primary"
          loading={generatingScript}
          icon={<Wand2 size={14} />}
          onClick={onGenerateScript}
        >
          Tạo kịch bản + từ khoá
        </Button>
        <Button loading={generatingTerms} onClick={onGenerateTerms}>
          Chỉ tạo từ khoá
        </Button>
      </div>

      <Field label="Kịch bản" hint="Bạn có thể chỉnh sửa trước khi tạo video">
        <Textarea
          value={params.video_script}
          onChange={(e) => update("video_script", e.target.value)}
          rows={8}
          placeholder="Kịch bản sẽ xuất hiện ở đây sau khi tạo..."
        />
      </Field>

      <Field label="Từ khoá tìm video" hint="Phân cách bằng dấu phẩy">
        <Textarea
          value={typeof params.video_terms === "string" ? params.video_terms : ""}
          onChange={(e) => update("video_terms", e.target.value)}
          rows={2}
          placeholder="dalat, hoa, vietnam, travel, sunset..."
        />
      </Field>
    </Section>
  );
}

function AudioSection({
  params,
  update,
  bgmType,
  setBgmType,
  voiceDisabled,
  bgmOptions,
  onUploadSong,
  uploadingSong,
}: {
  params: VideoParams;
  update: <K extends keyof VideoParams>(key: K, value: VideoParams[K]) => void;
  bgmType: "none" | "random" | "custom";
  setBgmType: (v: "none" | "random" | "custom") => void;
  voiceDisabled: boolean;
  bgmOptions: { value: string; label: string; hint?: string }[];
  onUploadSong: (file: File | null) => Promise<string | null>;
  uploadingSong: boolean;
}) {
  const customAudioName = params.custom_audio_file ? params.custom_audio_file.split("/").pop() ?? "" : "";
  const bgmUploadRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewErr, setPreviewErr] = useState("");
  const [localTtsInstalled, setLocalTtsInstalled] = useState<boolean | null>(null);
  const [installingTts, setInstallingTts] = useState(false);
  const [installErr, setInstallErr] = useState("");
  const [valtecRefExists, setValtecRefExists] = useState(false);
  const [settingRef, setSettingRef] = useState(false);

  useEffect(() => {
    if (params.tts_server === "valtec") {
      setLocalTtsInstalled(null);
      window.minclip.api
        .checkLocalTts()
        .then((r) => setLocalTtsInstalled(r.installed))
        .catch(() => setLocalTtsInstalled(null));
      window.minclip.api
        .getValtecReference()
        .then((r) => setValtecRefExists(r.exists))
        .catch(() => setValtecRefExists(false));
    }
  }, [params.tts_server]);

  const handleSetReference = async () => {
    setSettingRef(true);
    try {
      const r = await window.minclip.api.setValtecReference();
      if (r.ok) {
        setValtecRefExists(true);
        update("voice_name", "valtec:clone-Custom");
      }
    } finally {
      setSettingRef(false);
    }
  };

  // Giọng cho dropdown: thêm tuỳ chọn clone khi đã có giọng mẫu.
  const baseVoices = getVoices(params.tts_server);
  const voiceOptions =
    params.tts_server === "valtec" && valtecRefExists
      ? [...baseVoices, { value: "valtec:clone-Custom", label: "★ Giọng của bạn (clone)" }]
      : baseVoices;

  const handleInstallTts = async () => {
    setInstallingTts(true);
    setInstallErr("");
    try {
      const r = await window.minclip.api.installLocalTts();
      if (r.ok) setLocalTtsInstalled(true);
      else setInstallErr(r.error || "Cài đặt thất bại");
    } finally {
      setInstallingTts(false);
    }
  };

  const handlePreviewVoice = async () => {
    if (!params.voice_name) return;
    setPreviewing(true);
    setPreviewErr("");
    try {
      const r = await window.minclip.api.previewVoice({
        text: params.video_subject || params.video_script || "",
        voice: params.voice_name,
        rate: params.voice_rate,
        volume: params.voice_volume,
      });
      if (r.ok && r.media && previewAudioRef.current) {
        previewAudioRef.current.src = r.media;
        await previewAudioRef.current.play().catch(() => undefined);
      } else if (!r.ok) {
        setPreviewErr(r.error || "Không nghe thử được");
      }
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <Section
      title="Âm thanh"
      icon={<span className="text-base">🔊</span>}
      badge={
        voiceDisabled ? (
          <span className="chip">Không giọng đọc</span>
        ) : (
          <span className="chip chip-accent">{params.voice_name || "Chưa chọn"}</span>
        )
      }
    >
      <Field label="Dịch vụ giọng đọc">
        <Select
          value={params.tts_server || "azure-tts-v1"}
          onChange={(e) => {
            update("tts_server", e.target.value as TtsServer);
            update("voice_name", ""); // đổi dịch vụ → chọn lại giọng cho khớp
          }}
        >
          {TTS_SERVERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>

      {params.tts_server === "valtec" && localTtsInstalled === false && (
        <div
          className="rounded-xl p-3 border space-y-2"
          style={{ background: "rgba(34,211,238,0.08)", borderColor: "var(--color-border-strong)" }}
        >
          <div className="text-sm">
            Giọng tiếng Việt local cần <b>cài 1 lần</b> (tải engine ~vài phút, dùng đĩa ~1–2GB).{" "}
            <b>Miễn phí, chạy offline</b>, có phụ đề như thường.
          </div>
          <Button loading={installingTts} icon={<Upload size={13} />} onClick={handleInstallTts}>
            Cài đặt giọng Việt local
          </Button>
          {installErr && <div className="text-xs text-[var(--color-danger)]">{installErr}</div>}
          <div className="text-[10px] text-muted">
            Engine valtec-tts dùng giấy phép phi thương mại (CC BY-NC 4.0).
          </div>
        </div>
      )}
      {params.tts_server === "valtec" && localTtsInstalled === true && (
        <div
          className="rounded-xl p-3 border space-y-2"
          style={{ background: "rgba(34,211,238,0.06)", borderColor: "var(--color-border)" }}
        >
          <div className="text-xs text-[var(--color-success)]">
            ✓ Giọng Việt local đã sẵn sàng (lần đọc đầu tiên sẽ tải model giọng ~vài trăm MB)
          </div>
          <div className="text-sm font-medium">Giọng của chính bạn (clone)</div>
          <div className="text-xs text-muted">
            Tải lên 1 đoạn giọng mẫu <b>5–10 giây</b> (rõ tiếng, ít ồn) → app sẽ đọc kịch bản bằng giọng đó.
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button loading={settingRef} icon={<Upload size={13} />} onClick={handleSetReference}>
              {valtecRefExists ? "Đổi giọng mẫu" : "Chọn giọng mẫu"}
            </Button>
            {valtecRefExists && (
              <span className="text-xs text-[var(--color-success)]">
                ✓ Đã có giọng mẫu — chọn “★ Giọng của bạn (clone)” ở danh sách giọng
              </span>
            )}
          </div>
        </div>
      )}

      <Field label="Giọng đọc" hint="Gõ mã ngôn ngữ để lọc nhanh, vd: vi, en, ja">
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <SearchSelect
              value={params.voice_name ?? ""}
              onChange={(v) => {
                update("voice_name", v);
                setPreviewErr("");
              }}
              options={voiceOptions}
              placeholder={voiceDisabled ? "Không dùng giọng đọc" : "Chọn giọng đọc…"}
              emptyText="Không có giọng phù hợp"
              disabled={voiceDisabled}
            />
          </div>
          <Button
            loading={previewing}
            icon={<Volume2 size={13} />}
            disabled={voiceDisabled || !params.voice_name}
            onClick={handlePreviewVoice}
          >
            Nghe thử
          </Button>
        </div>
        {previewErr && <div className="text-xs text-[var(--color-danger)] mt-1">{previewErr}</div>}
        <audio ref={previewAudioRef} className="hidden" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={`Âm lượng: ${params.voice_volume}x`}>
          <input
            type="range"
            min={0.6}
            max={5}
            step={0.2}
            value={params.voice_volume}
            onChange={(e) => update("voice_volume", Number(e.target.value))}
          />
        </Field>
        <Field label={`Tốc độ: ${params.voice_rate}x`}>
          <input
            type="range"
            min={0.8}
            max={2}
            step={0.1}
            value={params.voice_rate}
            onChange={(e) => update("voice_rate", Number(e.target.value))}
          />
        </Field>
      </div>

      <Field
        label="Giọng đọc tuỳ chỉnh"
        hint="Chọn 1 file âm thanh có sẵn để dùng thay giọng đọc tự động (sẽ bỏ qua TTS)"
      >
        <SearchSelect
          value={customAudioName}
          onChange={(name) => update("custom_audio_file", name ? `resource/songs/${name}` : null)}
          options={bgmOptions}
          placeholder="Không dùng (mặc định dùng TTS)"
          emptyText="Chưa có file âm thanh nào"
        />
      </Field>

      <div className="divider" />

      <Field label="Nhạc nền">
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "none", l: "Không" },
            { v: "random", l: "Ngẫu nhiên" },
            { v: "custom", l: "Tự chọn" },
          ].map((o) => {
            const active = bgmType === o.v;
            return (
              <motion.button
                key={o.v}
                whileTap={{ scale: 0.96 }}
                onClick={() => setBgmType(o.v as "none" | "random" | "custom")}
                className={`py-2 rounded-lg text-sm font-medium border transition-all ${active
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                  }`}
              >
                {o.l}
              </motion.button>
            );
          })}
        </div>
      </Field>
      {bgmType === "custom" && (
        <Field label="Chọn nhạc nền" hint="Tìm và chọn từ kho, hoặc tải lên mp3 mới">
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <SearchSelect
                value={params.bgm_file ?? ""}
                onChange={(name) => update("bgm_file", name)}
                options={bgmOptions}
                placeholder="Chọn một bài nhạc nền…"
                emptyText="Kho nhạc trống — bấm Tải lên"
              />
            </div>
            <Button
              loading={uploadingSong}
              icon={<Upload size={13} />}
              onClick={() => bgmUploadRef.current?.click()}
            >
              Tải lên
            </Button>
            <input
              ref={bgmUploadRef}
              type="file"
              accept=".mp3,.MP3"
              className="hidden"
              onChange={async (e) => {
                const name = await onUploadSong(e.target.files?.[0] ?? null);
                if (name) update("bgm_file", name);
                e.target.value = "";
              }}
            />
          </div>
        </Field>
      )}
      <Field label={`Âm lượng nhạc nền: ${params.bgm_volume}`}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={params.bgm_volume}
          onChange={(e) => update("bgm_volume", Number(e.target.value))}
        />
      </Field>
    </Section>
  );
}

function SubtitleSection({
  params,
  update,
}: {
  params: VideoParams;
  update: <K extends keyof VideoParams>(key: K, value: VideoParams[K]) => void;
}) {
  const bgOn = params.text_background_color !== false && params.text_background_color !== undefined;
  const [fonts, setFonts] = useState<string[]>([]);
  const [uploadingFont, setUploadingFont] = useState(false);
  const loadFonts = () => window.minclip.api.listFonts().then(setFonts).catch(() => undefined);
  useEffect(() => {
    loadFonts();
  }, []);
  const handleUploadFont = async () => {
    setUploadingFont(true);
    try {
      const r = await window.minclip.api.uploadFont();
      if (r.ok && r.added.length) {
        await loadFonts();
        update("font_name", r.added[0]);
      }
    } finally {
      setUploadingFont(false);
    }
  };
  return (
    <Section
      title="Phụ đề"
      icon={<span className="text-base">💬</span>}
      badge={
        params.subtitle_enabled ? <span className="chip chip-accent">Bật</span> : <span className="chip">Tắt</span>
      }
    >
      <Field label="Bật phụ đề">
        <Toggle
          checked={!!params.subtitle_enabled}
          onChange={(v) => update("subtitle_enabled", v)}
        />
      </Field>

      <Field label="Font chữ" hint="Chọn từ danh sách hoặc tải lên file .ttf/.ttc/.otf">
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <SearchSelect
              value={params.font_name ?? ""}
              onChange={(v) => update("font_name", v)}
              options={fonts.map((f) => ({ value: f, label: f }))}
              placeholder="Chọn font…"
              emptyText="Chưa có font nào"
              allowClear={false}
            />
          </div>
          <Button icon={<Upload size={13} />} loading={uploadingFont} onClick={handleUploadFont}>
            Tải lên
          </Button>
        </div>
      </Field>

      <Field label="Vị trí phụ đề">
        <Select
          value={params.subtitle_position}
          onChange={(e) =>
            update(
              "subtitle_position",
              e.target.value as "top" | "center" | "bottom" | "custom",
            )
          }
        >
          <option value="top">Trên</option>
          <option value="center">Giữa</option>
          <option value="bottom">Dưới</option>
          <option value="custom">Tuỳ chỉnh</option>
        </Select>
      </Field>

      {params.subtitle_position === "custom" && (
        <Field label={`Vị trí tuỳ chỉnh (% từ trên): ${params.custom_position}`}>
          <input
            type="range"
            min={0}
            max={100}
            value={params.custom_position}
            onChange={(e) => update("custom_position", Number(e.target.value))}
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Màu chữ">
          <div className="flex gap-2">
            <input
              type="color"
              value={params.text_fore_color}
              onChange={(e) => update("text_fore_color", e.target.value)}
              className="w-10 h-9 rounded cursor-pointer border border-[var(--color-border)] bg-transparent"
            />
            <Input
              value={params.text_fore_color}
              onChange={(e) => update("text_fore_color", e.target.value)}
              className="flex-1"
            />
          </div>
        </Field>
        <Field label={`Cỡ chữ: ${params.font_size}`}>
          <input
            type="range"
            min={30}
            max={100}
            value={params.font_size}
            onChange={(e) => update("font_size", Number(e.target.value))}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Màu viền">
          <div className="flex gap-2">
            <input
              type="color"
              value={params.stroke_color}
              onChange={(e) => update("stroke_color", e.target.value)}
              className="w-10 h-9 rounded cursor-pointer border border-[var(--color-border)] bg-transparent"
            />
            <Input
              value={params.stroke_color}
              onChange={(e) => update("stroke_color", e.target.value)}
              className="flex-1"
            />
          </div>
        </Field>
        <Field label={`Độ dày viền: ${params.stroke_width}`}>
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={params.stroke_width}
            onChange={(e) => update("stroke_width", Number(e.target.value))}
          />
        </Field>
      </div>

      <Field label="Bật nền phụ đề">
        <Toggle
          checked={bgOn}
          onChange={(v) => update("text_background_color", v ? true : false)}
        />
      </Field>

      {bgOn && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-3"
        >
          <Field label="Màu nền phụ đề">
            <div className="flex gap-2">
              <input
                type="color"
                value={typeof params.text_background_color === "string" ? params.text_background_color : "#000000"}
                onChange={(e) => update("text_background_color", e.target.value)}
                className="w-10 h-9 rounded cursor-pointer border border-[var(--color-border)] bg-transparent"
              />
              <Input
                value={typeof params.text_background_color === "string" ? params.text_background_color : "#000000"}
                onChange={(e) => update("text_background_color", e.target.value)}
                className="flex-1"
              />
            </div>
          </Field>
          <Field label="Nền bo tròn">
            <Toggle
              checked={!!params.rounded_subtitle_background}
              onChange={(v) => update("rounded_subtitle_background", v)}
            />
          </Field>
        </motion.div>
      )}
    </Section>
  );
}