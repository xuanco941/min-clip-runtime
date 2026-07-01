import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Rocket,
  KeyRound,
  Image as ImageIcon,
  Mic2,
  Captions,
  Wand2,
  Music,
  Share2,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  Lightbulb,
  Settings as SettingsIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/Toast";
import { Section } from "../components/Section";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

/* ---------- Khối dùng lại ---------- */

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.minclip.api.openExternal(href)}
      className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline"
    >
      {children}
      <ExternalLink size={11} />
    </button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div
        className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
        style={{ background: "var(--gradient-primary)" }}
      >
        {n}
      </div>
      <div className="flex-1 text-sm">
        <span className="font-semibold">{title}</span>
        {children && <div className="text-muted leading-relaxed mt-0.5">{children}</div>}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 rounded bg-white/5 border border-[var(--color-border)] text-xs">{children}</code>;
}

/** Thẻ hướng dẫn 1 nhà cung cấp AI. */
function ProviderCard({
  name,
  badge,
  getUrl,
  getLabel,
  fields,
}: {
  name: string;
  badge?: string;
  getUrl: string;
  getLabel: string;
  fields: Array<{ k: string; v: string }>;
}) {
  return (
    <Card className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold">{name}</div>
        {badge && <span className="chip chip-accent text-[10px]">{badge}</span>}
      </div>
      <div className="text-xs text-muted">
        Lấy key tại: <ExtLink href={getUrl}>{getLabel}</ExtLink>
      </div>
      <div className="space-y-1">
        {fields.map((f) => (
          <div key={f.k} className="text-xs flex gap-2">
            <span className="text-muted w-24 shrink-0">{f.k}</span>
            <Kbd>{f.v}</Kbd>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------- Nội dung từng mục ---------- */

function HowToSet({ tab, fields }: { tab: string; fields: string }) {
  const navigate = useNavigate();
  return (
    <Section title="Cách điền trong app" icon={<SettingsIcon size={16} />} accent>
      <ol className="space-y-2 text-sm text-muted list-none">
        <Step n={1} title={`Mở Cài đặt → tab "${tab}".`} />
        <Step n={2} title="Điền các ô tương ứng" >{fields}</Step>
        <Step n={3} title='Bấm "Lưu".'>App tự áp dụng ngay (không cần khởi động lại).</Step>
      </ol>
      <Button variant="primary" icon={<SettingsIcon size={14} />} onClick={() => navigate("/settings")}>
        Mở Cài đặt
      </Button>
    </Section>
  );
}

function TopicStart() {
  const navigate = useNavigate();
  return (
    <>
      <Section title="min-clip là gì?" icon={<Lightbulb size={16} />} accent>
        <p className="text-sm text-muted leading-relaxed">
          min-clip biến một <b className="text-text">chủ đề</b> thành <b className="text-text">video ngắn</b> có giọng
          đọc và phụ đề (dọc/ngang/vuông) cho TikTok, Reels, YouTube Shorts. AI tự viết kịch bản, tìm video minh hoạ,
          đọc lời bình và ghép phụ đề. Mọi xử lý chạy ngầm trên máy bạn.
        </p>
      </Section>
      <Section title="3 bước để có video đầu tiên" icon={<Rocket size={16} />}>
        <div className="space-y-3">
          <Step n={1} title="Cài đặt khoá API (làm 1 lần)">
            Tối thiểu cần: 1 khoá <b className="text-text">AI</b> (viết kịch bản) + 1 khoá <b className="text-text">nguồn video</b>{" "}
            (Pexels/Pixabay/Coverr). Xem mục “AI / Nguồn video” bên trái.
          </Step>
          <Step n={2} title="Tạo video">
            Nhập chủ đề → “Tạo kịch bản + từ khoá” → chọn nguồn video, giọng đọc, phụ đề → “Tạo video ngay”.
          </Step>
          <Step n={3} title="Theo dõi & tải về">
            Xem tiến trình ở trang <b className="text-text">Tác vụ</b>, xem & tải kết quả ở <b className="text-text">Thư viện</b>.
          </Step>
        </div>
        <Button variant="primary" icon={<Wand2 size={14} />} onClick={() => navigate("/")}>
          Tới trang Tạo video
        </Button>
      </Section>
    </>
  );
}

function TopicLLM() {
  return (
    <>
      <Section title="Khoá AI (viết kịch bản & từ khoá)" icon={<KeyRound size={16} />} accent>
        <p className="text-sm text-muted leading-relaxed">
          Bạn chỉ cần <b className="text-text">một</b> nhà cung cấp. Nếu mới bắt đầu, nên dùng <b className="text-text">Google Gemini</b>{" "}
          (có gói miễn phí) hoặc <b className="text-text">DeepSeek</b> (rẻ). Mỗi thẻ dưới đây ghi nơi lấy key và giá trị nên điền.
        </p>
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ProviderCard
          name="Google Gemini"
          badge="Khuyến nghị · có free"
          getUrl="https://aistudio.google.com/app/apikey"
          getLabel="aistudio.google.com/app/apikey"
          fields={[
            { k: "Provider", v: "gemini" },
            { k: "Model Name", v: "gemini-3.5-flash" },
          ]}
        />
        <ProviderCard
          name="DeepSeek"
          badge="Rẻ"
          getUrl="https://platform.deepseek.com/api_keys"
          getLabel="platform.deepseek.com/api_keys"
          fields={[
            { k: "Provider", v: "deepseek" },
            { k: "Base URL", v: "https://api.deepseek.com" },
            { k: "Model Name", v: "deepseek-v4-flash" },
          ]}
        />
        <ProviderCard
          name="OpenAI"
          getUrl="https://platform.openai.com/api-keys"
          getLabel="platform.openai.com/api-keys"
          fields={[
            { k: "Provider", v: "openai" },
            { k: "Model Name", v: "gpt-5.4-mini" },
            { k: "Base URL", v: "(để trống)" },
          ]}
        />
        <ProviderCard
          name="Groq"
          badge="Nhanh · có free"
          getUrl="https://console.groq.com/keys"
          getLabel="console.groq.com/keys"
          fields={[
            { k: "Provider", v: "groq" },
            { k: "Base URL", v: "https://api.groq.com/openai/v1" },
            { k: "Model Name", v: "llama-3.3-70b-versatile" },
          ]}
        />
        <ProviderCard
          name="Moonshot (Kimi)"
          getUrl="https://platform.moonshot.cn/console/api-keys"
          getLabel="platform.moonshot.cn"
          fields={[
            { k: "Provider", v: "moonshot" },
            { k: "Base URL", v: "https://api.moonshot.cn/v1" },
            { k: "Model Name", v: "kimi-k2.6" },
          ]}
        />
        <ProviderCard
          name="Qwen (通义千问)"
          getUrl="https://dashscope.console.aliyun.com/apiKey"
          getLabel="dashscope.console.aliyun.com"
          fields={[
            { k: "Provider", v: "qwen" },
            { k: "Model Name", v: "qwen3.7-max" },
          ]}
        />
        <ProviderCard
          name="Grok (x.ai)"
          getUrl="https://console.x.ai"
          getLabel="console.x.ai"
          fields={[
            { k: "Provider", v: "grok" },
            { k: "Base URL", v: "https://api.x.ai/v1" },
            { k: "Model Name", v: "grok-4.3" },
          ]}
        />
        <ProviderCard
          name="Pollinations"
          badge="Miễn phí · không cần key"
          getUrl="https://pollinations.ai/"
          getLabel="pollinations.ai"
          fields={[
            { k: "Provider", v: "pollinations" },
            { k: "API Key", v: "(để trống)" },
            { k: "Model Name", v: "openai-fast" },
          ]}
        />
        <ProviderCard
          name="OpenRouter (nhiều model FREE)"
          badge="Có model miễn phí"
          getUrl="https://openrouter.ai/keys"
          getLabel="openrouter.ai/keys"
          fields={[
            { k: "Provider", v: "openrouter" },
            { k: "Base URL", v: "(để trống)" },
            { k: "Model Name", v: "deepseek/deepseek-r1:free" },
          ]}
        />
      </div>

      <Card className="text-xs text-muted space-y-1.5">
        <div className="text-text font-semibold text-sm">Dùng model FREE của OpenRouter</div>
        <div>
          Chọn Provider <Kbd>openrouter</Kbd> trong Cài đặt, dán API Key (lấy ở{" "}
          <ExtLink href="https://openrouter.ai/keys">openrouter.ai/keys</ExtLink>), Base URL để trống. Xong.
        </div>
        <div>
          Model miễn phí có đuôi <Kbd>:free</Kbd>. Ví dụ:{" "}
          <Kbd>deepseek/deepseek-r1:free</Kbd>, <Kbd>meta-llama/llama-3.3-70b-instruct:free</Kbd>,{" "}
          <Kbd>qwen/qwen3-coder:free</Kbd>, <Kbd>moonshotai/kimi-k2:free</Kbd>. Hoặc dùng bộ tự chọn{" "}
          <Kbd>openrouter/free</Kbd> (tự chọn 1 model free phù hợp).
        </div>
        <div>
          Danh sách free luôn cập nhật tại{" "}
          <ExtLink href="https://openrouter.ai/models?max_price=0">openrouter.ai/models (lọc Free)</ExtLink>. Lưu ý model
          free bị giới hạn lượt gọi (thường ~20 lần/phút, ~200 lần/ngày) và đôi khi bị xoá khỏi tier free.
        </div>
      </Card>

      <Card className="text-xs text-muted">
        Chạy AI ngay trên máy (không cần key, không cần mạng): cài <ExtLink href="https://ollama.com">Ollama</ExtLink>, chọn
        Provider <Kbd>ollama</Kbd>, Base URL <Kbd>http://localhost:11434/v1</Kbd>, Model là tên model bạn đã{" "}
        <Kbd>ollama pull</Kbd>. Các nhà cung cấp khác (Azure, MiniMax, MiMo, ModelScope, OneAPI, Cloudflare, LiteLLM, AIHubMix…) đều
        điền tương tự: Provider + API Key + Base URL + Model.
      </Card>

      <HowToSet
        tab="AI viết kịch bản"
        fields="Chọn Nhà cung cấp AI → dán API Key → điền Base URL & Model Name theo thẻ ở trên (đa số chỉ cần API Key)."
      />
    </>
  );
}

function TopicVideoSource() {
  return (
    <>
      <Section title="Nguồn video minh hoạ" icon={<ImageIcon size={16} />} accent>
        <p className="text-sm text-muted leading-relaxed">
          AI tìm video stock theo từ khoá. Cần API key của ít nhất một nguồn (miễn phí khi đăng ký). Có thể nhập{" "}
          <b className="text-text">nhiều key</b>, cách nhau bằng dấu phẩy, để tránh giới hạn lượt gọi.
        </p>
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ProviderCard
          name="Pexels"
          badge="Khuyến nghị"
          getUrl="https://www.pexels.com/api/"
          getLabel="pexels.com/api"
          fields={[{ k: "Điền vào", v: "Pexels API Key" }]}
        />
        <ProviderCard
          name="Pixabay"
          getUrl="https://pixabay.com/api/docs/"
          getLabel="pixabay.com/api/docs"
          fields={[{ k: "Điền vào", v: "Pixabay API Key" }]}
        />
        <ProviderCard
          name="Coverr"
          getUrl="https://coverr.co/developers"
          getLabel="coverr.co/developers"
          fields={[{ k: "Điền vào", v: "Coverr API Key" }]}
        />
      </div>

      <Card className="text-xs text-muted">
        Không muốn dùng video stock? Chọn nguồn <Kbd>File local</Kbd> ở trang Tạo video và tải lên video/ảnh của bạn — không cần
        key nào cả.
      </Card>
      <Card className="text-xs text-muted space-y-1">
        <div className="text-text font-semibold text-sm">Lấy video từ link (YouTube/TikTok/Facebook…)</div>
        <div>
          Trang <b className="text-text">Materials</b> → <b className="text-text">Thêm video từ link</b>: dán link, app tải về
          (qua yt-dlp) làm material. Khi tạo video chọn nguồn <Kbd>File local</Kbd> rồi tick chọn các video đã tải. Không cần key.
        </div>
        <div>Chỉ tải nội dung bạn có quyền sử dụng.</div>
      </Card>

      <HowToSet tab="Nguồn video" fields="Dán key vào ô Pexels / Pixabay / Coverr tương ứng (có thể nhiều key, cách nhau bằng dấu phẩy)." />
    </>
  );
}

function TopicTTS() {
  return (
    <>
      <Section title="Giọng đọc (TTS)" icon={<Mic2 size={16} />} accent>
        <p className="text-sm text-muted leading-relaxed">
          min-clip đọc lời bình bằng giọng AI. Nhanh nhất là dùng <b className="text-text">Azure TTS V1</b> — miễn phí,
          không cần key. Muốn <b className="text-text">nhiều giọng Việt</b> hoặc <b className="text-text">giọng của chính bạn</b>,
          dùng <b className="text-text">Tiếng Việt (local)</b> bên dưới.
        </p>
      </Section>

      <Card className="space-y-2" >
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">Tiếng Việt (local) — nhiều giọng + clone</div>
          <span className="chip chip-accent text-[10px]">Miễn phí · offline · có phụ đề</span>
        </div>
        <div className="text-xs text-muted">
          Ở trang Tạo video → Âm thanh → chọn <Kbd>Tiếng Việt (local, miễn phí)</Kbd>. Lần đầu bấm{" "}
          <b className="text-text">Cài đặt giọng Việt local</b> (tải engine ~1–2GB, 1 lần). Có <b className="text-text">5 giọng</b>{" "}
          Bắc/Nam và <b className="text-text">clone giọng của bạn</b> (tải 1 đoạn mẫu 5–10s). Vẫn có phụ đề như thường.
        </div>
        <div className="text-[10px] text-muted">
          Engine <ExtLink href="https://github.com/tronghieuit/valtec-tts">valtec-tts</ExtLink> — giấy phép phi thương mại (CC BY-NC 4.0).
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">Azure TTS V1 (Edge)</div>
            <span className="chip chip-accent text-[10px]">Miễn phí · không key</span>
          </div>
          <div className="text-xs text-muted">Chọn dịch vụ giọng đọc = <Kbd>azure-tts-v1</Kbd>. Không cần cấu hình thêm.</div>
          <div className="text-xs text-muted">
            Tên giọng (Voice), ví dụ tiếng Việt: <Kbd>vi-VN-HoaiMyNeural-Female</Kbd>, <Kbd>vi-VN-NamMinhNeural-Male</Kbd>.
          </div>
        </Card>
        <Card className="space-y-2">
          <div className="text-sm font-semibold">Azure Speech (V2)</div>
          <div className="text-xs text-muted">
            Tạo tài nguyên Speech tại{" "}
            <ExtLink href="https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/SpeechServices">
              portal.azure.com
            </ExtLink>{" "}
            → lấy <Kbd>Key</Kbd> và <Kbd>Region</Kbd>.
          </div>
          <div className="text-xs text-muted">Điền ở tab Giọng đọc: Azure Speech Region + Azure Speech Key.</div>
        </Card>
        <Card className="space-y-2">
          <div className="text-sm font-semibold">SiliconFlow TTS</div>
          <div className="text-xs text-muted">
            Lấy key tại <ExtLink href="https://siliconflow.cn">siliconflow.cn</ExtLink> → điền “SiliconFlow API Key”.
          </div>
        </Card>
        <Card className="space-y-2">
          <div className="text-sm font-semibold">Giọng đọc tuỳ chỉnh</div>
          <div className="text-xs text-muted">
            Muốn dùng giọng thật của bạn? Ở trang Tạo video → mục Âm thanh → “Giọng đọc tuỳ chỉnh”, chọn 1 file âm thanh có
            sẵn (thay cho TTS). Quản lý file ở trang Nhạc nền.
          </div>
        </Card>
      </div>

      <HowToSet
        tab="Giọng đọc"
        fields="Nếu dùng Azure: điền Region + Key. Nếu dùng SiliconFlow: điền API Key. Azure TTS V1 thì không cần gì."
      />
    </>
  );
}

function TopicSubtitle() {
  return (
    <>
      <Section title="Phụ đề" icon={<Captions size={16} />} accent>
        <p className="text-sm text-muted leading-relaxed">
          Phụ đề được tạo tự động từ lời đọc. Có 2 cách:
        </p>
        <ul className="space-y-2 text-sm text-muted mt-1">
          <li className="flex gap-2">
            <CheckCircle2 size={16} className="text-[var(--color-success)] shrink-0 mt-0.5" />
            <span>
              <b className="text-text">edge</b> (mặc định): nhanh, dùng kèm Azure TTS V1. Không cần cấu hình.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 size={16} className="text-[var(--color-success)] shrink-0 mt-0.5" />
            <span>
              <b className="text-text">whisper</b>: chính xác hơn, chạy bằng AI trên máy. Lần đầu sẽ tải model (~vài trăm MB).
              Đặt ở tab Phụ đề: Model <Kbd>large-v3</Kbd>, Device <Kbd>CPU</Kbd> (hoặc <Kbd>cuda</Kbd> nếu có GPU NVIDIA).
            </span>
          </li>
        </ul>
      </Section>
      <Card className="text-xs text-muted">
        Giao diện và kiểu phụ đề (font, màu chữ, viền, vị trí, nền) chỉnh trực tiếp ở trang <b className="text-text">Tạo video</b> → mục Phụ đề.
      </Card>
    </>
  );
}

function TopicCreate() {
  return (
    <>
      <Section title="Tạo video — từng bước" icon={<Wand2 size={16} />} accent>
        <div className="space-y-3">
          <Step n={1} title="Nhập chủ đề">Ví dụ: “Khám phá Đà Lạt mùa hoa anh đào”.</Step>
          <Step n={2} title="Tạo kịch bản + từ khoá">AI viết kịch bản và từ khoá tìm video. Bạn có thể chỉnh tay.</Step>
          <Step n={3} title="Chọn nguồn video & tỉ lệ">
            Pexels/Pixabay/Coverr hoặc File local. Tỉ lệ 9:16 (TikTok/Reels), 16:9 (YouTube), 1:1 (Instagram).
          </Step>
          <Step n={4} title="Chọn giọng đọc & phụ đề">Chọn dịch vụ giọng đọc + tên giọng; bật/tuỳ chỉnh phụ đề.</Step>
          <Step n={5} title="Âm thanh (tuỳ chọn)">Thêm nhạc nền, hoặc dùng giọng đọc tuỳ chỉnh thay TTS.</Step>
          <Step n={6} title='Bấm "Tạo video ngay"'>Tác vụ vào hàng đợi và bắt đầu xử lý.</Step>
          <Step n={7} title="Theo dõi & tải">Xem tiến trình ở Tác vụ; xem/tải kết quả ở Thư viện.</Step>
        </div>
      </Section>
      <Card className="text-xs text-muted">
        Nếu thiếu khoá API bắt buộc, trang Tạo video sẽ hiện cảnh báo vàng và đưa bạn tới Cài đặt — thiết lập xong là tạo
        được ngay.
      </Card>
    </>
  );
}

function TopicAudio() {
  return (
    <>
      <Section title="Nhạc nền, giọng đọc tuỳ chỉnh & Materials" icon={<Music size={16} />} accent>
        <div className="space-y-3 text-sm text-muted">
          <Step n={1} title="Nhạc nền (BGM)">
            Trang <b className="text-text">Nhạc nền</b>: tải lên / <b className="text-text">thêm nhạc từ link</b> / nghe thử /
            tìm kiếm mp3. Khi tạo video, chọn “Nhạc nền → Tự chọn” rồi tìm bài trong kho.
          </Step>
          <Step n={2} title="Giọng đọc tuỳ chỉnh">
            Dùng file âm thanh của bạn thay cho TTS: ở mục Âm thanh, chọn 1 file có sẵn trong kho (quản lý ở trang Nhạc nền).
          </Step>
          <Step n={3} title="Materials (video/ảnh của bạn)">
            Trang <b className="text-text">Materials</b>: tải lên video/ảnh để dùng khi chọn nguồn “File local”.
          </Step>
        </div>
      </Section>
    </>
  );
}

function TopicUpload() {
  return (
    <>
      <Section title="Đăng tự động (TikTok/Instagram/YouTube)" icon={<Share2 size={16} />} accent>
        <p className="text-sm text-muted leading-relaxed">
          min-clip có thể tự đăng video sau khi tạo, qua dịch vụ Upload-Post.
        </p>
        <div className="space-y-2 mt-1">
          <Step n={1} title="Tạo tài khoản & lấy API key">
            Đăng ký tại <ExtLink href="https://upload-post.com">upload-post.com</ExtLink>, lấy API key và username.
          </Step>
          <Step n={2} title="Điền ở tab “Đăng tự động”">
            Bật công tắc, dán API Key + Username, chọn nền tảng (tiktok, instagram, youtube).
          </Step>
        </div>
      </Section>
      <Card className="text-xs text-muted">
        Tài liệu Upload-Post: <ExtLink href="https://docs.upload-post.com">docs.upload-post.com</ExtLink>.
      </Card>
    </>
  );
}

function TopicFaq() {
  const navigate = useNavigate();
  return (
    <>
      <Section title="Cập nhật & vận hành" icon={<HelpCircle size={16} />} accent>
        <ul className="space-y-2 text-sm text-muted">
          {[
            "Cập nhật app: Cài đặt → Hệ thống → Cập nhật ứng dụng → Kiểm tra → Tải → Cài & khởi động lại.",
            "Đóng cửa sổ = app thu nhỏ xuống khay hệ thống và vẫn chạy. Bấm icon khay để mở lại; chọn “Thoát” để tắt hẳn.",
            "Video, nhạc và cài đặt của bạn được lưu an toàn, không mất khi app cập nhật.",
            "Lưu cài đặt sẽ tự khởi động lại bộ xử lý vài giây — nên chỉnh trước khi tạo video.",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <CheckCircle2 size={16} className="text-[var(--color-success)] shrink-0 mt-0.5" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Khắc phục sự cố thường gặp" icon={<HelpCircle size={16} />}>
        <div className="space-y-2 text-sm text-muted">
          <div><b className="text-text">Tạo kịch bản báo lỗi “api_key is not set”</b>: chưa điền/đúng khoá AI. Vào Cài đặt → AI viết kịch bản.</div>
          <div><b className="text-text">Không tìm được video</b>: kiểm tra khoá Pexels/Pixabay/Coverr ở tab Nguồn video.</div>
          <div><b className="text-text">Video không phát trong Thư viện</b>: chờ tác vụ “Hoàn thành” ở trang Tác vụ rồi mở lại.</div>
          <div><b className="text-text">Mãi không xong khi khởi động</b>: xem “Chi tiết kỹ thuật” ở màn hình khởi động, hoặc thử lại.</div>
        </div>
        <Button variant="primary" icon={<SettingsIcon size={14} />} onClick={() => navigate("/settings")}>
          Mở Cài đặt
        </Button>
      </Section>
    </>
  );
}

/* ---------- Trang chính ---------- */

const TOPICS = [
  { id: "start", label: "Bắt đầu", icon: Rocket, render: () => <TopicStart /> },
  { id: "llm", label: "Khoá AI (kịch bản)", icon: KeyRound, render: () => <TopicLLM /> },
  { id: "video", label: "Nguồn video", icon: ImageIcon, render: () => <TopicVideoSource /> },
  { id: "tts", label: "Giọng đọc", icon: Mic2, render: () => <TopicTTS /> },
  { id: "subtitle", label: "Phụ đề", icon: Captions, render: () => <TopicSubtitle /> },
  { id: "create", label: "Tạo video", icon: Wand2, render: () => <TopicCreate /> },
  { id: "audio", label: "Nhạc & Materials", icon: Music, render: () => <TopicAudio /> },
  { id: "upload", label: "Đăng tự động", icon: Share2, render: () => <TopicUpload /> },
  { id: "faq", label: "Cập nhật & FAQ", icon: HelpCircle, render: () => <TopicFaq /> },
];

export default function Guide() {
  const [topic, setTopic] = useState("start");
  const active = TOPICS.find((t) => t.id === topic) ?? TOPICS[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hướng dẫn sử dụng"
        subtitle="Cách lấy & cài API key, và cách dùng app từ A đến Z"
        icon={<BookOpen size={20} />}
      />

      <div className="flex gap-5 items-start">
        <nav className="w-56 shrink-0 sticky top-2 space-y-1">
          {TOPICS.map((t) => {
            const Icon = t.icon;
            const on = t.id === topic;
            return (
              <button
                key={t.id}
                onClick={() => setTopic(t.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-left transition-colors ${
                  on ? "text-white" : "text-muted hover:text-text hover:bg-white/[0.04]"
                }`}
                style={on ? { background: "var(--gradient-primary)" } : undefined}
              >
                <Icon size={15} className="shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={topic}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {active.render()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
