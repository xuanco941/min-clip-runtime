import { BrowserWindow, app } from "electron";
import path from "node:path";
import { loadWindowState, attachWindowStateSaver } from "./window-state";

const isDev = !app.isPackaged;

export async function createWindow(): Promise<BrowserWindow> {
  const state = await loadWindowState();

  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    frame: false, // bỏ title bar OS → chỉ còn window controls custom trong TopBar
    backgroundColor: "#0b1020",
    title: "min-clip",
    autoHideMenuBar: true,
    webPreferences: {
      // __dirname = dist/main/main → lùi 2 cấp về dist/, rồi preload/preload/index.js
      preload: path.join(__dirname, "..", "..", "preload", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => {
    if (state.isMaximized) win.maximize();
    win.show();
  });

  attachWindowStateSaver(win);

  win.on("close", () => {
    // before-quit hook will stop API server
  });

  if (isDev) {
    // Mở DevTools trong dev để xem lỗi console của renderer.
    win.webContents.once("did-frame-finish-load", () => {
      win.webContents.openDevTools({ mode: "detach" });
    });
  }

  return win;
}