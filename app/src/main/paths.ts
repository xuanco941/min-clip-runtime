// Trung tâm giải quyết đường dẫn cho min-clip.
//
// Layout dữ liệu người dùng (tách "thay được khi update" khỏi "phải giữ"):
//   %LOCALAPPDATA%\min-clip\
//   ├── runtime\                 # GHI ĐÈ khi update — payload tải về
//   │   ├── lib\                 # python, ffmpeg, imagemagick, git
//   │   └── MoneyPrinterTurbo\   # source FastAPI (KHÔNG sửa)
//   ├── userdata\                # GIỮ khi update — dữ liệu người dùng
//   │   ├── storage\             # task output, cache_videos (junction từ runtime)
//   │   ├── materials\           # material_directory
//   │   └── config.backup.toml   # bản sao config để khôi phục khi re-download
//   ├── runtime.version          # version payload đang cài
//   ├── downloads\               # file .part khi đang tải
//   └── logs\
//
// Dev mode: nếu đặt env MINCLIP_API_DIR thì dùng thẳng thư mục api/ trong repo,
// bỏ qua toàn bộ cơ chế tải.

import path from "node:path";
import { app } from "electron";

// Đường dẫn con cố định bên trong lib/ (khớp với api.bat / start.bat).
const FFMPEG_REL = path.join("lib", "ffmpeg", "ffmpeg-7.0-essentials_build", "ffmpeg.exe");
const IMAGEMAGICK_REL = path.join("lib", "imagemagic", "ImageMagick-7.1.1-29-portable-Q16-x64", "magick.exe");
const PYTHON_REL = path.join("lib", "python", "python.exe");
const PIP_REL = path.join("lib", "python", "Scripts", "pip.exe");
const GIT_REL = path.join("lib", "git", "bin", "git.exe");

export interface AppPaths {
  /** Có dùng thư mục api/ dev sẵn có (không cần tải) hay không. */
  devApiDir: string | null;
  /** %LOCALAPPDATA%\min-clip */
  baseDir: string;
  /** runtime/ — nơi giải nén payload (ghi đè khi update) */
  runtimeDir: string;
  /** userdata/ — dữ liệu người dùng (giữ khi update) */
  userDataDir: string;
  /** thư mục chứa file .part khi tải */
  downloadsDir: string;
  /** thư mục log */
  logsDir: string;
  /** thư mục chứa binary phụ trợ tải về (yt-dlp.exe...) */
  binDir: string;
  /** đường dẫn yt-dlp.exe */
  ytdlpExe: string;
  /** file đánh dấu version payload đã cài */
  runtimeVersionFile: string;

  // Đường dẫn bên trong runtime (hoặc devApiDir)
  apiBaseDir: string;
  mptDir: string;
  pythonBinary: string;
  pipBinary: string;
  gitBinary: string;
  ffmpegBinary: string;
  imagemagickBinary: string;
  entryScript: string;
  configToml: string;

  // userdata
  storageDir: string;
  materialsDir: string;
  configBackup: string;

  // media dirs (để phát nhạc/video local qua custom protocol)
  songsDir: string;
  localVideosDir: string;
}

function localAppData(): string {
  return process.env.LOCALAPPDATA || app.getPath("userData");
}

export function resolveAppPaths(): AppPaths {
  const devApiDir = process.env.MINCLIP_API_DIR || null;

  const baseDir = path.join(localAppData(), "min-clip");
  const runtimeDir = path.join(baseDir, "runtime");
  const userDataDir = path.join(baseDir, "userdata");

  // apiBaseDir = devApiDir nếu có (dev), ngược lại = runtimeDir.
  const apiBaseDir = devApiDir ?? runtimeDir;
  const mptDir = path.join(apiBaseDir, "MoneyPrinterTurbo");

  return {
    devApiDir,
    baseDir,
    runtimeDir,
    userDataDir,
    downloadsDir: path.join(baseDir, "downloads"),
    logsDir: path.join(baseDir, "logs"),
    binDir: path.join(baseDir, "bin"),
    ytdlpExe: path.join(baseDir, "bin", "yt-dlp.exe"),
    runtimeVersionFile: path.join(baseDir, "runtime.version"),

    apiBaseDir,
    mptDir,
    pythonBinary: path.join(apiBaseDir, PYTHON_REL),
    pipBinary: path.join(apiBaseDir, PIP_REL),
    gitBinary: path.join(apiBaseDir, GIT_REL),
    ffmpegBinary: path.join(apiBaseDir, FFMPEG_REL),
    imagemagickBinary: path.join(apiBaseDir, IMAGEMAGICK_REL),
    entryScript: path.join(mptDir, "main.py"),
    configToml: path.join(mptDir, "config.toml"),

    storageDir: path.join(userDataDir, "storage"),
    materialsDir: path.join(userDataDir, "materials"),
    configBackup: path.join(userDataDir, "config.backup.toml"),

    // BGM nằm trong resource/songs của runtime; video local trong storage/local_videos.
    songsDir: path.join(mptDir, "resource", "songs"),
    localVideosDir: path.join(userDataDir, "storage", "local_videos"),
  };
}
