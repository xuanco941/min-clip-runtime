import { BrowserWindow } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

export async function loadDevUrl(win: BrowserWindow): Promise<void> {
  const VITE_DEV_URL = process.env.VITE_DEV_URL ?? "http://localhost:5173";
  await win.loadURL(VITE_DEV_URL);
}

export async function loadProdIndex(win: BrowserWindow): Promise<void> {
  // Tìm dist/renderer/index.html theo nhiều vị trí có thể (dev vs packaged).
  const candidates = [
    path.join(__dirname, "..", "renderer", "index.html"),
    path.join(__dirname, "..", "..", "renderer", "index.html"),
    path.join(__dirname, "..", "..", "..", "dist", "renderer", "index.html"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      await win.loadURL(pathToFileURL(p).toString());
      return;
    }
  }
  throw new Error(
    "Không tìm thấy dist/renderer/index.html. Chạy `npm run build` trước, hoặc dùng `npm run dev`.",
  );
}
