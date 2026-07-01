export const IPC = {
  APP_READY: "app:ready",
  APP_STATUS: "app:status",
  API_BASE_URL: "api:base-url",
  API_RESTART: "api:restart",
  API_STOP: "api:stop",
  API_PING: "api:ping",
  API_LOG: "api:log",
  SHELL_OPEN_PATH: "shell:open-path",
  SHELL_OPEN_EXTERNAL: "shell:open-external",
  FS_LIST_DIR: "fs:list-dir",
  FS_DELETE_PATH: "fs:delete-path",
  FS_OPEN_TASK_FOLDER: "fs:open-task-folder",
  TTS_PREVIEW: "tts:preview",
  FONT_LIST: "font:list",
  FONT_UPLOAD: "font:upload",
  LOCAL_TTS_CHECK: "local-tts:check",
  LOCAL_TTS_INSTALL: "local-tts:install",
  VALTEC_GET_REFERENCE: "valtec:get-reference",
  VALTEC_SET_REFERENCE: "valtec:set-reference",
  YTDLP_IMPORT: "ytdlp:import",
  YTDLP_PROGRESS: "ytdlp:progress",
  UPDATER_CHECK: "updater:check",
  UPDATER_RUN: "updater:run",
  UPDATER_RESULT: "updater:result",
  SETUP_PROGRESS: "setup:progress",
  SETUP_RETRY: "setup:retry",
  SETUP_CANCEL: "setup:cancel",
  CONFIG_GET: "config:get",
  CONFIG_SET: "config:set",
  RUNTIME_INFO: "runtime:info",
  RUNTIME_RESET: "runtime:reset",
  APP_UPDATE_CHECK: "app-update:check",
  APP_UPDATE_DOWNLOAD: "app-update:download",
  APP_UPDATE_INSTALL: "app-update:install",
  APP_UPDATE_STATUS: "app-update:status",
  CONTRACT_CHECK: "contract:check",
  WINDOW_MINIMIZE: "window:minimize",
  WINDOW_MAXIMIZE: "window:maximize",
  WINDOW_CLOSE: "window:close",
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];

export type AppStatus =
  | "starting"
  | "downloading"
  | "extracting"
  | "spawning-python"
  | "waiting-ping"
  | "ready"
  | "error";

export interface AppStatusPayload {
  status: AppStatus;
  message?: string;
  progress?: number;
}

export interface SetupProgressPayload {
  phase: "downloading" | "extracting" | "installing";
  received: number;
  total: number | null;
  percent: number | null;
  bytesPerSec: number;
}

export type AppUpdateState =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface YtdlpProgressPayload {
  phase: "preparing" | "downloading";
  percent: number | null;
  message?: string;
}

export interface AppUpdateStatusPayload {
  state: AppUpdateState;
  currentVersion?: string;
  version?: string; // version mới (nếu có)
  percent?: number;
  bytesPerSec?: number;
  message?: string;
  notes?: string;
}

export interface ApiLogPayload {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: number;
}

export interface UpdaterResultPayload {
  success: boolean;
  message: string;
  changed: boolean;
  log: string[];
}