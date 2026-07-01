import { ipcMain, shell, BrowserWindow, dialog } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { IPC } from "../shared/ipc-channels";
import type { ApiServer } from "./api-server";
import type { Updater } from "./updater";
import type { AppPaths } from "./paths";
import { checkContract } from "./contract";
import { readConfig, applyConfigUpdates, type ConfigUpdate } from "./config-toml";
import { backupConfig } from "./extractor";
import { getRuntimeInfo, markRuntimeForReinstall } from "./bootstrap";
import { importMedia, type ImportKind } from "./ytdlp";
import { sendYtdlpProgress } from "./status";

export interface IpcHandlerDeps {
  getApiUrl: () => string | null;
  getApiServer: () => ApiServer | null;
  getUpdater: () => Updater | null;
  paths: AppPaths;
}

export function registerIpcHandlers(deps: IpcHandlerDeps): void {
  ipcMain.handle(IPC.API_BASE_URL, () => deps.getApiUrl());

  ipcMain.handle(IPC.API_PING, async () => {
    const url = deps.getApiUrl();
    if (!url) return { ok: false, error: "no api url" };
    try {
      // MPT không đăng ký /ping — dùng /docs (FastAPI Swagger) để kiểm tra sống.
      const res = await fetch(`${url}/docs`, { signal: AbortSignal.timeout(3000) });
      return { ok: res.ok, status: res.status };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle(IPC.API_RESTART, async () => {
    const server = deps.getApiServer();
    if (!server) throw new Error("No api server");
    const url = await server.restart();
    return { url };
  });

  ipcMain.handle(IPC.API_STOP, async () => {
    deps.getApiServer()?.stop();
    return { ok: true };
  });

  ipcMain.handle(IPC.SHELL_OPEN_PATH, async (_e, p: string) => {
    if (!p) return { ok: false, error: "empty path" };
    const err = await shell.openPath(p);
    return { ok: !err, error: err || undefined };
  });

  ipcMain.handle(IPC.SHELL_OPEN_EXTERNAL, async (_e, url: string) => {
    await shell.openExternal(url);
    return { ok: true };
  });

  ipcMain.handle(IPC.FS_LIST_DIR, async (_e, dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      path: path.join(dir, e.name),
      isDirectory: e.isDirectory(),
      isFile: e.isFile(),
    }));
  });

  ipcMain.handle(IPC.FS_DELETE_PATH, async (_e, p: string) => {
    await fs.rm(p, { recursive: true, force: true });
    return { ok: true };
  });

  ipcMain.handle(IPC.FS_OPEN_TASK_FOLDER, async (_e, taskId: string) => {
    if (!taskId) return { ok: false, error: "no task id" };
    // API ghi vào <mptDir>/storage/tasks (= junction tới userdata/storage ở prod,
    // = thư mục thật ở dev). Dùng mptDir để đúng cả hai chế độ.
    const folder = path.join(deps.paths.mptDir, "storage", "tasks", taskId);
    const err = await shell.openPath(folder);
    return { ok: !err, error: err || undefined };
  });

  ipcMain.handle(IPC.UPDATER_CHECK, async () => {
    const u = deps.getUpdater();
    if (!u) throw new Error("No updater");
    return u.check();
  });

  ipcMain.handle(IPC.UPDATER_RUN, async () => {
    const u = deps.getUpdater();
    if (!u) throw new Error("No updater");
    return u.run_full();
  });

  ipcMain.handle(IPC.CONTRACT_CHECK, async () => {
    return checkContract(deps.getApiUrl());
  });

  ipcMain.handle(IPC.CONFIG_GET, async () => {
    return readConfig(deps.paths.configToml);
  });

  ipcMain.handle(IPC.CONFIG_SET, async (_e, updates: ConfigUpdate[]) => {
    if (!Array.isArray(updates) || updates.length === 0) return { ok: true, restarted: false };
    await applyConfigUpdates(deps.paths.configToml, updates);
    // Mirror sang userdata để khôi phục khi re-download runtime.
    await backupConfig(deps.paths);
    // QUAN TRỌNG: API (Python) chỉ đọc config.toml MỘT LẦN lúc khởi động
    // (config.app là dict nạp sẵn). Phải khởi động lại để áp dụng thay đổi.
    // Cổng được giữ nguyên (config.toml giữ listen_port) nên baseUrl không đổi.
    let restarted = false;
    const server = deps.getApiServer();
    if (server) {
      try {
        await server.restart();
        restarted = true;
      } catch {
        // Lưu config thành công nhưng restart lỗi — vẫn báo ok để user biết đã lưu.
      }
    }
    return { ok: true, restarted };
  });

  // Nghe thử giọng đọc: chạy một tiến trình Python một lần gọi voice.tts của
  // MoneyPrinterTurbo để tổng hợp mp3 mẫu, rồi renderer phát qua minclip-media://.
  ipcMain.handle(
    IPC.TTS_PREVIEW,
    async (
      _e,
      opts: { text?: string; voice: string; rate?: number; volume?: number },
    ): Promise<{ ok: boolean; media?: string; error?: string }> => {
      if (!opts?.voice) return { ok: false, error: "Chưa chọn giọng đọc" };
      const tempDir = path.join(deps.paths.mptDir, "storage", "temp");
      await fs.mkdir(tempDir, { recursive: true });
      const fileName = `preview-${crypto.randomUUID()}.mp3`;
      const outFile = path.join(tempDir, fileName);

      const payload = JSON.stringify({
        text: opts.text?.trim() || "Xin chào, đây là giọng đọc thử của min-clip.",
        voice: opts.voice,
        rate: opts.rate ?? 1.0,
        volume: opts.volume ?? 1.0,
        out: outFile,
      });

      const script = [
        "import sys, json, os, traceback",
        "from app.services import voice",
        "a = json.loads(sys.argv[1])",
        "ok = False",
        "try:",
        "    sm = voice.tts(text=a['text'], voice_name=a['voice'], voice_rate=a['rate'], voice_file=a['out'], voice_volume=a['volume'])",
        "    ok = bool(sm) and os.path.exists(a['out'])",
        "except Exception:",
        "    print('ERR:' + traceback.format_exc().strip().splitlines()[-1])",
        "print('OK' if ok else 'FAIL')",
      ].join("\n");

      // voice.tts thường bắt lỗi nội bộ rồi trả None + ghi log lỗi qua loguru (stderr).
      // Lấy đúng dòng lỗi thay vì phần đầu (toàn log INFO).
      const extractError = (stdout: string, stderr: string): string => {
        const errLine = stdout
          .split(/\r?\n/)
          .find((l) => l.startsWith("ERR:"));
        if (errLine) return errLine.slice(4).trim();
        const lines = stderr.split(/\r?\n/).filter(Boolean);
        const errs = lines.filter((l) => /error|exception|traceback|not set|fail|invalid|denied|quota|permission|not found|404|403|401/i.test(l));
        const picked = (errs.length ? errs : lines).slice(-4).join(" | ");
        return picked.slice(-400) || "Tổng hợp giọng thất bại";
      };

      const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        const proc = spawn(deps.paths.pythonBinary, ["-c", script, payload], {
          cwd: deps.paths.mptDir,
          env: {
            ...process.env,
            FFMPEG_BINARY: deps.paths.ffmpegBinary,
            IMAGEMAGICK_BINARY: deps.paths.imagemagickBinary,
          },
          windowsHide: true,
        });
        let out = "";
        let err = "";
        const timer = setTimeout(() => {
          try {
            proc.kill();
          } catch {
            // ignore
          }
          resolve({ ok: false, error: "Quá thời gian tổng hợp giọng (lần đầu giọng local tải model có thể lâu — thử lại)." });
        }, 120_000);
        proc.stdout?.on("data", (d: Buffer) => (out += d.toString()));
        proc.stderr?.on("data", (d: Buffer) => (err += d.toString()));
        proc.on("error", (e) => {
          clearTimeout(timer);
          resolve({ ok: false, error: String(e) });
        });
        proc.on("close", () => {
          clearTimeout(timer);
          if (out.includes("OK")) resolve({ ok: true });
          else resolve({ ok: false, error: extractError(out, err) });
        });
      });

      if (!result.ok) return result;
      return { ok: true, media: `minclip-media://storage/temp/${encodeURIComponent(fileName)}` };
    },
  );

  // Engine giọng Việt local (valtec-tts). Kiểm tra + cài vào runtime python.
  ipcMain.handle(IPC.LOCAL_TTS_CHECK, async (): Promise<{ installed: boolean }> => {
    const r = spawnSync(deps.paths.pythonBinary, ["-c", "import valtec_tts"], {
      cwd: deps.paths.mptDir,
      windowsHide: true,
      timeout: 30_000,
    });
    return { installed: r.status === 0 };
  });

  ipcMain.handle(IPC.LOCAL_TTS_INSTALL, async (): Promise<{ ok: boolean; error?: string }> => {
    // pip cần `git` trên PATH để cài git+... → thêm thư mục git của runtime.
    const gitBinDir = path.dirname(deps.paths.gitBinary);
    return new Promise((resolve) => {
      const proc = spawn(
        deps.paths.pythonBinary,
        ["-m", "pip", "install", "git+https://github.com/tronghieuit/valtec-tts.git"],
        {
          cwd: deps.paths.mptDir,
          windowsHide: true,
          env: { ...process.env, PATH: `${gitBinDir}${path.delimiter}${process.env.PATH ?? ""}` },
        },
      );
      let err = "";
      proc.stderr?.on("data", (d: Buffer) => (err += d.toString()));
      const timer = setTimeout(() => {
        try {
          proc.kill();
        } catch {
          // ignore
        }
        resolve({ ok: false, error: "Quá thời gian cài đặt (mạng chậm?). Thử lại." });
      }, 25 * 60_000);
      proc.on("error", (e) => {
        clearTimeout(timer);
        resolve({ ok: false, error: String(e) });
      });
      proc.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve({ ok: true });
        else resolve({ ok: false, error: (err || "pip install thất bại").slice(-400) });
      });
    });
  });

  // Giọng mẫu để clone (valtec ZeroShot). Lưu ở userdata, trỏ config tới nó.
  ipcMain.handle(IPC.VALTEC_GET_REFERENCE, async (): Promise<{ exists: boolean }> => {
    try {
      const cfg = await readConfig(deps.paths.configToml);
      const ref = String((cfg.app as Record<string, unknown> | undefined)?.valtec_reference_audio || "");
      if (!ref) return { exists: false };
      try {
        await fs.access(ref);
        return { exists: true };
      } catch {
        return { exists: false };
      }
    } catch {
      return { exists: false };
    }
  });

  ipcMain.handle(
    IPC.VALTEC_SET_REFERENCE,
    async (e): Promise<{ ok: boolean; name?: string; error?: string }> => {
      const win = BrowserWindow.fromWebContents(e.sender) ?? BrowserWindow.getAllWindows()[0];
      const res = await dialog.showOpenDialog(win, {
        title: "Chọn file giọng mẫu của bạn (5–10 giây, rõ tiếng, ít ồn)",
        properties: ["openFile"],
        filters: [{ name: "Audio", extensions: ["wav", "mp3", "m4a", "aac", "flac", "ogg"] }],
      });
      if (res.canceled || res.filePaths.length === 0) return { ok: false };
      const src = res.filePaths[0];
      await fs.mkdir(deps.paths.userDataDir, { recursive: true });
      const dest = path.join(deps.paths.userDataDir, "valtec_reference.wav");
      // Chuẩn hoá về wav 24kHz mono (valtec mong đợi); lỗi thì copy nguyên bản.
      const conv = spawnSync(
        deps.paths.ffmpegBinary,
        ["-y", "-i", src, "-ar", "24000", "-ac", "1", dest],
        { windowsHide: true, timeout: 60_000 },
      );
      if (conv.status !== 0) {
        try {
          await fs.copyFile(src, dest);
        } catch (err) {
          return { ok: false, error: `Không xử lý được file: ${String(err)}` };
        }
      }
      await applyConfigUpdates(deps.paths.configToml, [
        { section: "app", key: "valtec_reference_audio", value: dest },
      ]);
      await backupConfig(deps.paths);
      try {
        await deps.getApiServer()?.restart();
      } catch {
        // API sẽ nạp reference ở lần khởi động kế tiếp
      }
      return { ok: true, name: path.basename(src) };
    },
  );

  const fontDir = () => path.join(deps.paths.mptDir, "resource", "fonts");
  const FONT_EXT = /\.(ttf|ttc|otf)$/i;

  ipcMain.handle(IPC.FONT_LIST, async (): Promise<string[]> => {
    try {
      const entries = await fs.readdir(fontDir());
      return entries.filter((f) => FONT_EXT.test(f)).sort((a, b) => a.localeCompare(b));
    } catch {
      return [];
    }
  });

  ipcMain.handle(IPC.FONT_UPLOAD, async (e): Promise<{ ok: boolean; added: string[]; error?: string }> => {
    const win = BrowserWindow.fromWebContents(e.sender) ?? BrowserWindow.getAllWindows()[0];
    const res = await dialog.showOpenDialog(win, {
      title: "Chọn file font (.ttf, .ttc, .otf)",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Font", extensions: ["ttf", "ttc", "otf"] }],
    });
    if (res.canceled || res.filePaths.length === 0) return { ok: false, added: [] };
    const dir = fontDir();
    await fs.mkdir(dir, { recursive: true });
    const added: string[] = [];
    try {
      for (const p of res.filePaths) {
        const base = path.basename(p);
        await fs.copyFile(p, path.join(dir, base));
        added.push(base);
      }
      return { ok: true, added };
    } catch (err) {
      return { ok: false, added, error: String(err) };
    }
  });

  ipcMain.handle(
    IPC.YTDLP_IMPORT,
    async (_e, opts: { kind: ImportKind; url: string }): Promise<{ ok: boolean; name?: string; error?: string }> => {
      if (!opts?.url) return { ok: false, error: "Thiếu link" };
      return importMedia({
        paths: deps.paths,
        url: opts.url,
        kind: opts.kind === "audio" ? "audio" : "video",
        onProgress: (p) => sendYtdlpProgress(p),
      });
    },
  );

  ipcMain.handle(IPC.RUNTIME_INFO, async () => {
    return getRuntimeInfo(deps.paths);
  });

  ipcMain.handle(IPC.RUNTIME_RESET, async () => {
    await markRuntimeForReinstall(deps.paths);
    return { ok: true };
  });

  ipcMain.on(IPC.WINDOW_MINIMIZE, (e) => {
    BrowserWindow.fromWebContents(e.sender)?.minimize();
  });
  ipcMain.on(IPC.WINDOW_MAXIMIZE, (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on(IPC.WINDOW_CLOSE, (e) => {
    BrowserWindow.fromWebContents(e.sender)?.close();
  });
}