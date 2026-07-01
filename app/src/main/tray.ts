import { Tray, Menu, app, BrowserWindow, nativeImage } from "electron";
import path from "node:path";
import fs from "node:fs";

let tray: Tray | null = null;

function makeIconPath(): string {
  const candidates = [
    path.join(process.resourcesPath || "", "assets", "icon.ico"),
    path.join(__dirname, "..", "..", "..", "assets", "icon.ico"),
    path.join(__dirname, "..", "..", "assets", "icon.ico"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // continue
    }
  }
  return candidates[0];
}

export function createTray(onShow: () => void, onQuit: () => void): Tray {
  if (tray) return tray;
  let image: Electron.NativeImage;
  try {
    image = nativeImage.createFromPath(makeIconPath());
    if (image.isEmpty()) image = nativeImage.createEmpty();
  } catch {
    image = nativeImage.createEmpty();
  }
  tray = new Tray(image);
  tray.setToolTip("min-clip");
  rebuildMenu(onShow, onQuit);
  tray.on("double-click", onShow);
  return tray;
}

function rebuildMenu(onShow: () => void, onQuit: () => void): void {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label: "Mở min-clip",
      click: onShow,
    },
    { type: "separator" },
    {
      label: "Khởi động lại API",
      click: () => {
        const win = BrowserWindow.getAllWindows()[0];
        win?.webContents.send("tray:restart-api");
      },
    },
    { type: "separator" },
    {
      label: "Thoát",
      click: onQuit,
    },
  ]);
  tray.setContextMenu(menu);
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}