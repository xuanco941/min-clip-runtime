import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ChevronRight, ChevronLeft, Wand2, Film, ListTodo, Settings as SettingsIcon } from "lucide-react";
import { Button } from "./Button";

const STORAGE_KEY = "minclip.onboarding.done";

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  tip: string;
}

const STEPS: Step[] = [
  {
    title: "Chào mừng tới min-clip",
    description:
      "min-clip giúp bạn tạo video ngắn bằng AI với giao diện Windows native, đẹp và dễ dùng.",
    icon: <Sparkles size={28} />,
    tip: "Mọi thứ chạy ngầm, bạn không cần mở terminal.",
  },
  {
    title: "Tạo video AI",
    description:
      "Nhập chủ đề, chọn nguồn video, giọng đọc, font phụ đề — bấm một nút, AI lo phần còn lại.",
    icon: <Wand2 size={28} />,
    tip: "Mẹo: thử Moonshot hoặc DeepSeek — không cần VPN, rẻ, chất lượng tốt.",
  },
  {
    title: "Theo dõi tác vụ & thư viện",
    description:
      "Tab 'Tác vụ' hiển thị tiến trình realtime. Tab 'Thư viện' để xem lại và tải video đã xong.",
    icon: <ListTodo size={28} />,
    tip: "Phím tắt Ctrl+K mở bảng lệnh nhanh.",
  },
  {
    title: "Cấu hình API key",
    description:
      "Vào Settings → LLM để dán API key (OpenAI, Moonshot, DeepSeek…). Pexels/Pixabay cho video stock ở tab 'Nguồn video'.",
    icon: <SettingsIcon size={28} />,
    tip: "Một số provider không cần key (pollinations, mặc định).",
  },
];

export function Onboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setShow(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative w-full max-w-lg rounded-3xl glass-strong p-7 overflow-hidden"
          >
            <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-[var(--color-accent)]/20 blur-3xl pointer-events-none" />
            <button
              onClick={finish}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-white/5 transition-colors"
            >
              <X size={14} />
            </button>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 float"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {STEPS[step].icon}
                </div>
                <h2 className="text-xl font-bold gradient-text mb-2">{STEPS[step].title}</h2>
                <p className="text-sm text-muted leading-relaxed mb-3">{STEPS[step].description}</p>
                <div className="text-xs px-3 py-2 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-border)] text-[var(--color-accent)]">
                  💡 {STEPS[step].tip}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`h-1 rounded-full transition-all ${
                      i === step
                        ? "w-8 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-3)]"
                        : i < step
                          ? "w-1.5 bg-[var(--color-accent)]/40"
                          : "w-1.5 bg-white/10"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button
                    size="sm"
                    icon={<ChevronLeft size={12} />}
                    onClick={() => setStep((s) => s - 1)}
                  >
                    Trước
                  </Button>
                )}
                {step < STEPS.length - 1 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Tiếp <ChevronRight size={12} />
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={finish}>
                    Bắt đầu nào
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}