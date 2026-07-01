// Tự cập nhật VỎ APP (Electron) qua electron-updater + GitHub Releases.
//
// Chiến lược: thủ công — người dùng bấm "Kiểm tra" → "Tải" → "Cài & khởi động lại"
// trong Settings. App đọc release `v<version>` ở repo cấu hình trong package.json
// (build.publish). Cùng số version với payload API (xem runtime-config.ts).

import { EventEmitter } from "node:events";
import { app } from "electron";
import { autoUpdater } from "electron-updater";
import { IPC } from "../shared/ipc-channels";
import type { AppUpdateStatusPayload } from "../shared/ipc-channels";
import { sendAppUpdateStatus } from "./status";

export class AppUpdater extends EventEmitter {
  private last: AppUpdateStatusPayload = { state: "idle", currentVersion: app.getVersion() };

  init(): void {
    autoUpdater.autoDownload = false; // người dùng tự bấm tải
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on("checking-for-update", () => this.push({ state: "checking" }));
    autoUpdater.on("update-available", (info) =>
      this.push({ state: "available", version: info.version, notes: stringifyNotes(info.releaseNotes) }),
    );
    autoUpdater.on("update-not-available", (info) => this.push({ state: "not-available", version: info.version }));
    autoUpdater.on("download-progress", (p) =>
      this.push({ state: "downloading", percent: Math.round(p.percent), bytesPerSec: p.bytesPerSecond }),
    );
    autoUpdater.on("update-downloaded", (info) => this.push({ state: "downloaded", version: info.version }));
    autoUpdater.on("error", (err) => this.push({ state: "error", message: String(err?.message ?? err) }));
  }

  private push(partial: Partial<AppUpdateStatusPayload>): void {
    this.last = { currentVersion: app.getVersion(), ...this.last, ...partial };
    sendAppUpdateStatus(this.last);
    this.emit("status", this.last);
  }

  /** Kiểm tra có bản mới không (KHÔNG tự tải). */
  async check(): Promise<AppUpdateStatusPayload> {
    if (!app.isPackaged) {
      this.push({ state: "not-available", message: "Đang ở chế độ dev — không kiểm tra cập nhật." });
      return this.last;
    }
    try {
      this.push({ state: "checking" });
      const result = await autoUpdater.checkForUpdates();
      if (!result || !result.updateInfo) {
        this.push({ state: "not-available" });
      }
      // Các event update-available / not-available đã cập nhật trạng thái.
    } catch (err) {
      this.push({ state: "error", message: String((err as Error).message ?? err) });
    }
    return this.last;
  }

  /** Tải bản cập nhật về (sau khi check thấy available). */
  async download(): Promise<AppUpdateStatusPayload> {
    if (!app.isPackaged) {
      this.push({ state: "error", message: "Không tải được ở chế độ dev." });
      return this.last;
    }
    try {
      await autoUpdater.downloadUpdate();
    } catch (err) {
      this.push({ state: "error", message: String((err as Error).message ?? err) });
    }
    return this.last;
  }

  /** Thoát app và cài bản đã tải (app sẽ tự khởi động lại). */
  install(): void {
    if (this.last.state !== "downloaded") return;
    // isSilent=false để hiện UI cài; isForceRunAfter=true để mở lại app sau cài.
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
  }

  get status(): AppUpdateStatusPayload {
    return this.last;
  }
}

function stringifyNotes(notes: unknown): string | undefined {
  if (!notes) return undefined;
  if (typeof notes === "string") return notes;
  if (Array.isArray(notes)) {
    return notes.map((n) => (typeof n === "string" ? n : (n as { note?: string }).note ?? "")).join("\n");
  }
  return undefined;
}

export const IPC_APP_UPDATE = {
  CHECK: IPC.APP_UPDATE_CHECK,
  DOWNLOAD: IPC.APP_UPDATE_DOWNLOAD,
  INSTALL: IPC.APP_UPDATE_INSTALL,
} as const;
