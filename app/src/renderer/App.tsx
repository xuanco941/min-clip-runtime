import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import StartupScreen from "./components/StartupScreen";
import Home from "./pages/Home";
import Tasks from "./pages/Tasks";
import Library from "./pages/Library";
import Materials from "./pages/Materials";
import BGM from "./pages/BGM";
import Tools from "./pages/Tools";
import Settings from "./pages/Settings";
import Guide from "./pages/Guide";
import TopBar from "./components/TopBar";
import { ParticleBackground } from "./components/ParticleBackground";
import { CommandPalette } from "./components/CommandPalette";
import { Onboarding } from "./components/Onboarding";
import { ToastHost } from "./components/ToastHost";
import { MiniTaskBar } from "./components/MiniTaskBar";
import { useBootstrap } from "./lib/store";
import { useGlobalNotifications } from "./lib/use-notifications";
import "./lib/i18n";
import type { AppStatusPayload } from "../preload/types";

export default function App() {
  const [status, setStatus] = useState<AppStatusPayload>({ status: "starting" });
  const [ready, setReady] = useState(false);
  useBootstrap();
  // Hook phải gọi vô điều kiện trước mọi early return; useTasks bên trong tự
  // bật khi đã có baseUrl nên an toàn dù chạy ngay từ màn khởi động.
  useGlobalNotifications();

  useEffect(() => {
    const off = window.minclip.events.onAppStatus((payload) => {
      setStatus(payload);
      if (payload.status === "ready") setReady(true);
    });
    return off;
  }, []);

  if (!ready) {
    return (
      <>
        <ParticleBackground />
        <StartupScreen
          status={status}
          onRetry={() => {
            setStatus({ status: "starting", message: "Đang thử lại..." });
            window.minclip.api.retrySetup().catch(() => window.location.reload());
          }}
        />
      </>
    );
  }

  return (
    <>
      <ParticleBackground />
      <div className="h-full flex bg-transparent text-text">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto px-8 py-6">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<PageWrap key="home"><Home /></PageWrap>} />
                <Route path="/tasks" element={<PageWrap key="tasks"><Tasks /></PageWrap>} />
                <Route path="/library" element={<PageWrap key="library"><Library /></PageWrap>} />
                <Route path="/materials" element={<PageWrap key="materials"><Materials /></PageWrap>} />
                <Route path="/bgm" element={<PageWrap key="bgm"><BGM /></PageWrap>} />
                <Route path="/tools" element={<PageWrap key="tools"><Tools /></PageWrap>} />
                <Route path="/settings" element={<PageWrap key="settings"><Settings /></PageWrap>} />
                <Route path="/guide" element={<PageWrap key="guide"><Guide /></PageWrap>} />
              </Routes>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <CommandPalette />
      <Onboarding />
      <MiniTaskBar />
      <ToastHost />
    </>
  );
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-[1400px] mx-auto"
    >
      {children}
    </motion.div>
  );
}
