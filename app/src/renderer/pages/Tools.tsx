import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, Sparkles, Hash, Share2, Copy, Check } from "lucide-react";
import { PageHeader, Toast, type ToastKind } from "../components/Toast";
import { Section } from "../components/Section";
import { Field, Input, Textarea, Select } from "../components/Field";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useGenerateScript, useGenerateSocialMetadata, useGenerateTerms } from "../lib/store";
import type { SocialMetadata } from "../lib/api-types";

const SCRIPT_LANGS = [
  { code: "", label: "Tự động" },
  { code: "vi-VN", label: "Tiếng Việt" },
  { code: "en-US", label: "English" },
  { code: "zh-CN", label: "中文" },
];

const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube Shorts" },
  { value: "facebook", label: "Facebook" },
];

export default function Tools() {
  const [scriptSubject, setScriptSubject] = useState("");
  const [scriptLang, setScriptLang] = useState("");
  const [scriptResult, setScriptResult] = useState("");

  const [termsSubject, setTermsSubject] = useState("");
  const [termsScript, setTermsScript] = useState("");
  const [termsResult, setTermsResult] = useState<string[]>([]);

  const [socialSubject, setSocialSubject] = useState("");
  const [socialScript, setSocialScript] = useState("");
  const [socialPlatform, setSocialPlatform] = useState("tiktok");
  const [socialResult, setSocialResult] = useState<SocialMetadata | null>(null);

  const [toast, setToast] = useState<{ show: boolean; kind: ToastKind; message: string }>({
    show: false,
    kind: "info",
    message: "",
  });

  const showToast = (kind: ToastKind, message: string) => {
    setToast({ show: true, kind, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  const genScript = useGenerateScript();
  const genTerms = useGenerateTerms();
  const genSocial = useGenerateSocialMetadata();

  const handleScript = async () => {
    if (!scriptSubject) {
      showToast("error", "Nhập chủ đề");
      return;
    }
    try {
      const r = await genScript.mutateAsync({
        video_subject: scriptSubject,
        video_language: scriptLang,
      });
      setScriptResult(r.video_script);
      showToast("success", "Đã tạo kịch bản");
    } catch (err) {
      showToast("error", `Lỗi: ${(err as Error).message}`);
    }
  };

  const handleTerms = async () => {
    if (!termsScript) {
      showToast("error", "Cần có kịch bản");
      return;
    }
    try {
      const r = await genTerms.mutateAsync({ video_subject: termsSubject, video_script: termsScript });
      setTermsResult(r.video_terms);
      showToast("success", `Đã tạo ${r.video_terms.length} từ khoá`);
    } catch (err) {
      showToast("error", `Lỗi: ${(err as Error).message}`);
    }
  };

  const handleSocial = async () => {
    if (!socialSubject) {
      showToast("error", "Nhập chủ đề");
      return;
    }
    try {
      const r = await genSocial.mutateAsync({
        video_subject: socialSubject,
        video_script: socialScript,
        platform: socialPlatform,
      });
      setSocialResult(r);
      showToast("success", "Đã tạo metadata");
    } catch (err) {
      showToast("error", `Lỗi: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Công cụ AI"
        subtitle="Script, từ khoá, metadata cho mạng xã hội"
        icon={<Wrench size={20} />}
      />

      <Section
        title="Tạo kịch bản"
        icon={<Sparkles size={14} />}
        accent
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Field label="Chủ đề">
              <Input value={scriptSubject} onChange={(e) => setScriptSubject(e.target.value)} />
            </Field>
          </div>
          <Field label="Ngôn ngữ">
            <Select value={scriptLang} onChange={(e) => setScriptLang(e.target.value)}>
              {SCRIPT_LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button variant="primary" loading={genScript.isPending} onClick={handleScript} icon={<Sparkles size={14} />}>
          Tạo kịch bản
        </Button>
        <AnimatePresence>
          {scriptResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Textarea value={scriptResult} readOnly rows={8} className="font-sans" />
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      <Section title="Tạo từ khoá" icon={<Hash size={14} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Chủ đề">
            <Input value={termsSubject} onChange={(e) => setTermsSubject(e.target.value)} />
          </Field>
          <Field label="Số lượng">
            <Input type="number" min={3} max={15} defaultValue={5} disabled />
          </Field>
        </div>
        <Field label="Kịch bản">
          <Textarea value={termsScript} onChange={(e) => setTermsScript(e.target.value)} rows={5} />
        </Field>
        <Button loading={genTerms.isPending} onClick={handleTerms} icon={<Hash size={14} />}>
          Tạo từ khoá
        </Button>
        <AnimatePresence>
          {termsResult.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {termsResult.map((t, i) => (
                <motion.span
                  key={t}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="chip chip-accent"
                >
                  {t}
                </motion.span>
              ))}
            </div>
          )}
        </AnimatePresence>
      </Section>

      <Section title="Metadata cho MXH" icon={<Share2 size={14} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Chủ đề">
            <Input value={socialSubject} onChange={(e) => setSocialSubject(e.target.value)} />
          </Field>
          <Field label="Nền tảng">
            <Select value={socialPlatform} onChange={(e) => setSocialPlatform(e.target.value)}>
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Kịch bản (tuỳ chọn)">
          <Textarea value={socialScript} onChange={(e) => setSocialScript(e.target.value)} rows={4} />
        </Field>
        <Button loading={genSocial.isPending} onClick={handleSocial} icon={<Share2 size={14} />}>
          Tạo metadata
        </Button>
        <AnimatePresence>
          {socialResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Card>
                <div className="text-xs text-muted mb-1">Tiêu đề</div>
                <div className="text-sm font-semibold">{socialResult.title}</div>
              </Card>
              <Card>
                <div className="text-xs text-muted mb-1">Mô tả</div>
                <div className="text-sm">{socialResult.caption}</div>
              </Card>
              <Card>
                <div className="text-xs text-muted mb-1">Hashtag</div>
                <div className="flex flex-wrap gap-1.5">
                  {socialResult.hashtags.map((h, i) => (
                    <motion.span
                      key={h}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="chip"
                    >
                      {h}
                    </motion.span>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      <Toast
        kind={toast.kind}
        message={toast.message}
        show={toast.show}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
    </div>
  );
}