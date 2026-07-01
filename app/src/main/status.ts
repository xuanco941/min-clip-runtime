import { BrowserWindow } from "electron";
import { IPC } from "../shared/ipc-channels";
import type {
  AppStatusPayload,
  SetupProgressPayload,
  AppUpdateStatusPayload,
  YtdlpProgressPayload,
} from "../shared/ipc-channels";

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  }
}

export function sendAppStatus(payload: AppStatusPayload): void {
  broadcast(IPC.APP_STATUS, payload);
}

export function sendSetupProgress(payload: SetupProgressPayload): void {
  broadcast(IPC.SETUP_PROGRESS, payload);
}

export function sendAppUpdateStatus(payload: AppUpdateStatusPayload): void {
  broadcast(IPC.APP_UPDATE_STATUS, payload);
}

export function sendYtdlpProgress(payload: YtdlpProgressPayload): void {
  broadcast(IPC.YTDLP_PROGRESS, payload);
}
