import { app, BrowserWindow, ipcMain } from "electron";
import { IPC } from "../shared/ipc-channels";
import { ApiServer } from "./api-server";
import { Updater } from "./updater";
import { registerIpcHandlers } from "./ipc-handlers";
import { sendAppStatus, sendSetupProgress } from "./status";
import { createTray, destroyTray } from "./tray";
import { resolveAppPaths, type AppPaths } from "./paths";
import { ensureRuntime, isRuntimeInstalled } from "./bootstrap";
import { AppUpdater } from "./app-updater";
import { registerMediaScheme, handleMediaProtocol } from "./media-protocol";

// Phải đăng ký scheme TRƯỚC khi app ready.
registerMediaScheme();

const isDev = !app.isPackaged;

let apiServer: ApiServer | null = null;
let updater: Updater | null = null;
let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// Single-instance lock: mở lần 2 → focus cửa sổ cũ.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

async function ensureRuntimeWithUi(paths: AppPaths): Promise<void> {
  if (await isRuntimeInstalled(paths)) return;

  await ensureRuntime(paths, {
    onStatus: (message) => sendAppStatus({ status: "extracting", message }),
    onProgress: (p) => {
      const speed = `${formatBytes(p.bytesPerSec)}/s`;
      const sizeText = p.total ? `${formatBytes(p.received)} / ${formatBytes(p.total)}` : formatBytes(p.received);
      sendAppStatus({
        status: "downloading",
        message: `Đang tải dữ liệu cần thiết: ${sizeText} (${speed})`,
        progress: p.percent ?? undefined,
      });
      sendSetupProgress({
        phase: "downloading",
        received: p.received,
        total: p.total,
        percent: p.percent,
        bytesPerSec: p.bytesPerSec,
      });
    },
  });
}

let starting = false;
let servicesReady = false;

/** Tải runtime (nếu cần) + khởi động API. Có thể gọi lại qua SETUP_RETRY. */
async function startServices(paths: AppPaths, win: BrowserWindow): Promise<void> {
  if (starting || servicesReady) return;
  starting = true;
  try {
    // First-run: tải + cài runtime nếu cần (hiển thị tiến độ qua IPC).
    await ensureRuntimeWithUi(paths);

    sendAppStatus({ status: "spawning-python", message: "Đang chuẩn bị..." });

    apiServer = new ApiServer({
      pythonBinary: paths.pythonBinary,
      entryScript: paths.entryScript,
      mptDir: paths.mptDir,
      configToml: paths.configToml,
      ffmpegBinary: paths.ffmpegBinary,
      imagemagickBinary: paths.imagemagickBinary,
      materialsDir: paths.materialsDir,
      isDev,
    });

    apiServer.on("status", (payload) => sendAppStatus(payload));
    apiServer.on("log", (line) => {
      if (!win.isDestroyed()) win.webContents.send("api:log", line);
    });

    const apiUrl = await apiServer.start();
    void apiUrl;
    sendAppStatus({ status: "ready", message: "Sẵn sàng!" });

    updater = new Updater({ apiBaseDir: paths.apiBaseDir });

    createTray(
      () => {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      },
      () => {
        isQuitting = true;
        app.quit();
      },
    );

    servicesReady = true;
    // eslint-disable-next-line no-console
    console.log("[min-clip] READY");
  } catch (err) {
    sendAppStatus({ status: "error", message: String(err) });
    // eslint-disable-next-line no-console
    console.error("startServices failed:", err);
  } finally {
    starting = false;
  }
}

async function bootstrap(): Promise<void> {
  sendAppStatus({ status: "starting", message: "Đang khởi động min-clip..." });

  handleMediaProtocol(); // phục vụ minclip-media:// cho phát nhạc/video local

  const paths = resolveAppPaths();
  // eslint-disable-next-line no-console
  console.log(`[min-clip] mode=${isDev ? "dev" : "packaged"} runtime=${paths.apiBaseDir}`);

  const { createWindow } = await import("./window");
  const { loadDevUrl, loadProdIndex } = await import("./window-loader");
  const win = await createWindow();
  mainWindow = win;
  setupWindowBackground(win);

  // Đăng ký IPC SỚM (trước khi load renderer) để các lệnh getBaseUrl... không
  // bị "No handler registered". Dùng getter vì apiServer/updater tạo sau.
  registerIpcHandlers({
    getApiUrl: () => apiServer?.baseUrl ?? null,
    getApiServer: () => apiServer,
    getUpdater: () => updater,
    paths,
  });

  // Auto-update VỎ APP (electron-updater). Thủ công: check/download/install.
  const appUpdater = new AppUpdater();
  appUpdater.init();
  ipcMain.handle(IPC.APP_UPDATE_CHECK, () => appUpdater.check());
  ipcMain.handle(IPC.APP_UPDATE_DOWNLOAD, () => appUpdater.download());
  ipcMain.handle(IPC.APP_UPDATE_INSTALL, () => {
    isQuitting = true; // cho phép thoát thật để cài
    appUpdater.install();
    return { ok: true };
  });

  // Retry: chạy lại toàn bộ chuỗi tải+khởi động mà không cần reload renderer.
  ipcMain.handle(IPC.SETUP_RETRY, async () => {
    await startServices(paths, win);
    return { ok: true };
  });

  // Tải renderer SỚM để hiển thị màn hình Setup/Startup trong lúc tải runtime.
  if (process.env.VITE_DEV_URL) {
    await loadDevUrl(win);
  } else {
    await loadProdIndex(win);
  }

  await startServices(paths, win);
}

/** Đóng cửa sổ = thu nhỏ vào tray (chạy ngầm), KHÔNG kill API.
 *  Chỉ áp dụng sau khi services sẵn sàng (tray đã tồn tại) — nếu đang tải/lỗi
 *  mà đóng cửa sổ thì thoát hẳn để không bị "tàng hình". */
function setupWindowBackground(win: BrowserWindow): void {
  win.on("close", (e) => {
    if (!isQuitting && servicesReady) {
      e.preventDefault();
      win.hide();
    }
  });
}

app.whenReady().then(bootstrap).catch((err) => {
  sendAppStatus({ status: "error", message: String(err) });
  // eslint-disable-next-line no-console
  console.error("Bootstrap failed:", err);
});

// Chạy ngầm: KHÔNG quit khi đóng cửa sổ nếu đã sẵn sàng (sống trong tray).
// Nếu đóng khi chưa sẵn sàng (đang tải/lỗi) thì thoát hẳn.
app.on("window-all-closed", () => {
  if (!servicesReady) app.quit();
});

app.on("before-quit", () => {
  isQuitting = true;
  destroyTray();
  apiServer?.stop();
});

app.on("activate", () => {
  if (mainWindow) {
    mainWindow.show();
  } else if (apiServer === null) {
    bootstrap();
  }
});
