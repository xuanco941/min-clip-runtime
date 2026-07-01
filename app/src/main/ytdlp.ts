// Import video/nhạc từ link bằng yt-dlp (bản .exe độc lập, tải khi cần).
// Tải về đúng thư mục API đã đọc sẵn → KHÔNG cần sửa api/.

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type { AppPaths } from "./paths";
import { downloadFile, type DownloadProgress } from "./downloader";

const YTDLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";

export type ImportKind = "video" | "audio";

export interface YtdlpProgress {
  phase: "preparing" | "downloading";
  percent: number | null;
  message?: string;
}

/** Đảm bảo có yt-dlp.exe (tải nếu thiếu). Trả về đường dẫn exe. */
export async function ensureYtDlp(paths: AppPaths, onProgress?: (p: YtdlpProgress) => void): Promise<string> {
  try {
    await fsp.access(paths.ytdlpExe);
    return paths.ytdlpExe;
  } catch {
    // chưa có → tải
  }
  await fsp.mkdir(paths.binDir, { recursive: true });
  onProgress?.({ phase: "preparing", percent: null, message: "Đang tải công cụ yt-dlp..." });
  await downloadFile({
    url: YTDLP_URL,
    destPath: paths.ytdlpExe,
    onProgress: (p: DownloadProgress) =>
      onProgress?.({ phase: "preparing", percent: p.percent, message: "Đang tải công cụ yt-dlp..." }),
  });
  return paths.ytdlpExe;
}

function targetDir(paths: AppPaths, kind: ImportKind): string {
  return kind === "audio"
    ? path.join(paths.mptDir, "resource", "songs")
    : path.join(paths.mptDir, "storage", "local_videos");
}

export interface ImportOptions {
  paths: AppPaths;
  url: string;
  kind: ImportKind;
  onProgress?: (p: YtdlpProgress) => void;
}

/** Tải 1 link về thư mục material (video) hoặc songs (audio). Trả tên file. */
export async function importMedia(opts: ImportOptions): Promise<{ ok: boolean; name?: string; error?: string }> {
  const { paths, url, kind, onProgress } = opts;
  if (!url || !/^https?:\/\//i.test(url.trim())) {
    return { ok: false, error: "Link không hợp lệ (phải bắt đầu bằng http/https)." };
  }

  let exe: string;
  try {
    exe = await ensureYtDlp(paths, onProgress);
  } catch (err) {
    return { ok: false, error: `Không tải được yt-dlp: ${String(err)}` };
  }

  const dir = targetDir(paths, kind);
  await fsp.mkdir(dir, { recursive: true });
  const ffmpegDir = path.dirname(paths.ffmpegBinary);
  const outTemplate = path.join(dir, "%(title).60s-%(id)s.%(ext)s");

  const common = [
    "--no-playlist",
    "--restrict-filenames",
    "--no-warnings",
    "--ffmpeg-location",
    ffmpegDir,
    "-o",
    outTemplate,
    "--print",
    "after_move:filepath",
    "--newline",
  ];
  const args =
    kind === "audio"
      ? [...common, "-x", "--audio-format", "mp3", url.trim()]
      : [...common, "-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b", "--merge-output-format", "mp4", url.trim()];

  return new Promise((resolve) => {
    const proc = spawn(exe, args, { windowsHide: true });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      try {
        proc.kill();
      } catch {
        // ignore
      }
      resolve({ ok: false, error: "Quá thời gian tải (mạng chậm hoặc video quá dài)." });
    }, 15 * 60_000);

    proc.stdout.setEncoding("utf-8");
    proc.stderr.setEncoding("utf-8");
    proc.stdout.on("data", (chunk: string) => {
      out += chunk;
      for (const line of chunk.split(/\r?\n/)) {
        const m = line.match(/\[download\]\s+([\d.]+)%/);
        if (m) onProgress?.({ phase: "downloading", percent: parseFloat(m[1]) });
      }
    });
    proc.stderr.on("data", (chunk: string) => (err += chunk));

    proc.on("error", (e) => {
      clearTimeout(timer);
      resolve({ ok: false, error: String(e) });
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      // Tìm dòng là đường dẫn file thật trong thư mục đích.
      // Dòng do `--print after_move:filepath` in ra là đường dẫn file thật.
      const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const fileLine = [...lines].reverse().find((l) => {
        try {
          return fs.existsSync(l) && fs.statSync(l).isFile();
        } catch {
          return false;
        }
      });
      if (code === 0 && fileLine) {
        resolve({ ok: true, name: path.basename(fileLine) });
      } else {
        const reason = (err || out || "Tải thất bại").split(/\r?\n/).filter(Boolean).slice(-3).join(" | ");
        resolve({ ok: false, error: reason.slice(-400) });
      }
    });
  });
}
