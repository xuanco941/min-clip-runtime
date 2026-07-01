// @ts-nocheck
const { contextBridge, ipcRenderer } = require("electron");
const { IPC } = require("../shared/ipc-channels");

const api = {
  getBaseUrl: () => ipcRenderer.invoke(IPC.API_BASE_URL),
  ping: () => ipcRenderer.invoke(IPC.API_PING),
  restart: () => ipcRenderer.invoke(IPC.API_RESTART),
  stop: () => ipcRenderer.invoke(IPC.API_STOP),
  openPath: (p) => ipcRenderer.invoke(IPC.SHELL_OPEN_PATH, p),
  openExternal: (url) => ipcRenderer.invoke(IPC.SHELL_OPEN_EXTERNAL, url),
  listDir: (dir) => ipcRenderer.invoke(IPC.FS_LIST_DIR, dir),
  deletePath: (p) => ipcRenderer.invoke(IPC.FS_DELETE_PATH, p),
  openTaskFolder: (id) => ipcRenderer.invoke(IPC.FS_OPEN_TASK_FOLDER, id),
  previewVoice: (opts) => ipcRenderer.invoke(IPC.TTS_PREVIEW, opts),
  listFonts: () => ipcRenderer.invoke(IPC.FONT_LIST),
  uploadFont: () => ipcRenderer.invoke(IPC.FONT_UPLOAD),
  checkLocalTts: () => ipcRenderer.invoke(IPC.LOCAL_TTS_CHECK),
  installLocalTts: () => ipcRenderer.invoke(IPC.LOCAL_TTS_INSTALL),
  getValtecReference: () => ipcRenderer.invoke(IPC.VALTEC_GET_REFERENCE),
  setValtecReference: () => ipcRenderer.invoke(IPC.VALTEC_SET_REFERENCE),
  importMedia: (kind, url) => ipcRenderer.invoke(IPC.YTDLP_IMPORT, { kind, url }),
  checkUpdate: () => ipcRenderer.invoke(IPC.UPDATER_CHECK),
  runUpdate: () => ipcRenderer.invoke(IPC.UPDATER_RUN),
  checkContract: () => ipcRenderer.invoke(IPC.CONTRACT_CHECK),
  getConfig: () => ipcRenderer.invoke(IPC.CONFIG_GET),
  setConfig: (updates) => ipcRenderer.invoke(IPC.CONFIG_SET, updates),
  getRuntimeInfo: () => ipcRenderer.invoke(IPC.RUNTIME_INFO),
  resetRuntime: () => ipcRenderer.invoke(IPC.RUNTIME_RESET),
  checkAppUpdate: () => ipcRenderer.invoke(IPC.APP_UPDATE_CHECK),
  downloadAppUpdate: () => ipcRenderer.invoke(IPC.APP_UPDATE_DOWNLOAD),
  installAppUpdate: () => ipcRenderer.invoke(IPC.APP_UPDATE_INSTALL),
  retrySetup: () => ipcRenderer.invoke(IPC.SETUP_RETRY),
  minimize: () => ipcRenderer.send(IPC.WINDOW_MINIMIZE),
  maximize: () => ipcRenderer.send(IPC.WINDOW_MAXIMIZE),
  close: () => ipcRenderer.send(IPC.WINDOW_CLOSE),
};

const events = {
  onAppStatus: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on("app:status", listener);
    return () => ipcRenderer.removeListener("app:status", listener);
  },
  onApiLog: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on("api:log", listener);
    return () => ipcRenderer.removeListener("api:log", listener);
  },
  onSetupProgress: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on(IPC.SETUP_PROGRESS, listener);
    return () => ipcRenderer.removeListener(IPC.SETUP_PROGRESS, listener);
  },
  onAppUpdateStatus: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on(IPC.APP_UPDATE_STATUS, listener);
    return () => ipcRenderer.removeListener(IPC.APP_UPDATE_STATUS, listener);
  },
  onYtdlpProgress: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on(IPC.YTDLP_PROGRESS, listener);
    return () => ipcRenderer.removeListener(IPC.YTDLP_PROGRESS, listener);
  },
};

contextBridge.exposeInMainWorld("minclip", { api, events });