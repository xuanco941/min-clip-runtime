import type {
  AppStatusPayload,
  ApiLogPayload,
  SetupProgressPayload,
  AppUpdateStatusPayload,
  YtdlpProgressPayload,
} from "../shared/ipc-channels";

export type {
  AppStatusPayload,
  ApiLogPayload,
  SetupProgressPayload,
  AppUpdateStatusPayload,
  YtdlpProgressPayload,
  UpdaterResultPayload,
} from "../shared/ipc-channels";

export interface MinclipApi {
  getBaseUrl: () => Promise<string | null>;
  ping: () => Promise<{ ok: boolean; status?: number; error?: string }>;
  restart: () => Promise<{ url: string }>;
  stop: () => Promise<{ ok: boolean }>;
  openPath: (p: string) => Promise<{ ok: boolean; error?: string }>;
  openExternal: (url: string) => Promise<{ ok: boolean }>;
  listDir: (dir: string) => Promise<
    Array<{ name: string; path: string; isDirectory: boolean; isFile: boolean }>
  >;
  deletePath: (p: string) => Promise<{ ok: boolean }>;
  openTaskFolder: (id: string) => Promise<{ ok: boolean; error?: string }>;
  previewVoice: (opts: { text?: string; voice: string; rate?: number; volume?: number }) => Promise<{
    ok: boolean;
    media?: string;
    error?: string;
  }>;
  listFonts: () => Promise<string[]>;
  uploadFont: () => Promise<{ ok: boolean; added: string[]; error?: string }>;
  checkLocalTts: () => Promise<{ installed: boolean }>;
  installLocalTts: () => Promise<{ ok: boolean; error?: string }>;
  getValtecReference: () => Promise<{ exists: boolean }>;
  setValtecReference: () => Promise<{ ok: boolean; name?: string; error?: string }>;
  importMedia: (kind: "video" | "audio", url: string) => Promise<{ ok: boolean; name?: string; error?: string }>;
  checkUpdate: () => Promise<{ hasUpdate: boolean; log: string[] }>;
  runUpdate: () => Promise<{ success: boolean; message: string; changed: boolean; log: string[] }>;
  checkContract: () => Promise<{
    contractVersion: string;
    minMptVersion: string;
    runningMptVersion: string | null;
    apiBaseUrl: string | null;
    expected: { paths: Record<string, string> };
    actual: { paths: Record<string, string[]> } | null;
    diff: { missingInMpt: string[]; extraInMpt: string[]; ok: string[] };
    error: string | null;
  }>;
  getConfig: () => Promise<Record<string, Record<string, ConfigValue>>>;
  setConfig: (updates: ConfigUpdateInput[]) => Promise<{ ok: boolean; restarted?: boolean }>;
  getRuntimeInfo: () => Promise<RuntimeInfo>;
  resetRuntime: () => Promise<{ ok: boolean }>;
  checkAppUpdate: () => Promise<AppUpdateStatusPayload>;
  downloadAppUpdate: () => Promise<AppUpdateStatusPayload>;
  installAppUpdate: () => Promise<{ ok: boolean }>;
  retrySetup: () => Promise<{ ok: boolean }>;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
}

export type ConfigValue = string | number | boolean | string[];

export interface RuntimeInfo {
  installed: string | null;
  expected: string;
  ready: boolean;
  devApiDir: string | null;
}

export interface ConfigUpdateInput {
  section: string | null; // null = key top-level
  key: string;
  value: ConfigValue;
}

export interface MinclipEvents {
  onAppStatus: (cb: (payload: AppStatusPayload) => void) => () => void;
  onApiLog: (cb: (payload: ApiLogPayload) => void) => () => void;
  onSetupProgress: (cb: (payload: SetupProgressPayload) => void) => () => void;
  onAppUpdateStatus: (cb: (payload: AppUpdateStatusPayload) => void) => () => void;
  onYtdlpProgress: (cb: (payload: YtdlpProgressPayload) => void) => () => void;
}

declare global {
  interface Window {
    minclip: {
      api: MinclipApi;
      events: MinclipEvents;
    };
  }
}