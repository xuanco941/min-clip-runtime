// Điều phối: kiểm tra runtime đã cài chưa, nếu chưa thì tải payload từ
// GitHub Releases + verify + giải nén. Đây là "First-Run Wizard" ở phía main.

import fsp from "node:fs/promises";
import path from "node:path";
import type { AppPaths } from "./paths";
import { resolveRuntimeSource, RUNTIME_VERSION } from "./runtime-config";
import { downloadFile, fetchText, parseSha256, type DownloadProgress } from "./downloader";
import { installRuntime, backupConfig } from "./extractor";

async function exists(p: string): Promise<boolean> {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Runtime coi như đã cài nếu có python.exe + main.py (+ version khớp). */
export async function isRuntimeInstalled(paths: AppPaths): Promise<boolean> {
  if (!(await exists(paths.pythonBinary))) return false;
  if (!(await exists(paths.entryScript))) return false;
  // Dev mode (MINCLIP_API_DIR) không cần file version.
  if (paths.devApiDir) return true;
  if (!(await exists(paths.runtimeVersionFile))) return false;
  try {
    const v = (await fsp.readFile(paths.runtimeVersionFile, "utf-8")).trim();
    return v === RUNTIME_VERSION;
  } catch {
    return false;
  }
}

export interface BootstrapCallbacks {
  onStatus?: (message: string) => void;
  onProgress?: (p: DownloadProgress) => void;
  signal?: AbortSignal;
}

/**
 * Đảm bảo runtime sẵn sàng. Nếu đã cài → trả về ngay. Nếu chưa → tải + cài.
 * Ném lỗi nếu thất bại (caller hiển thị + cho Retry).
 */
export async function ensureRuntime(paths: AppPaths, cb: BootstrapCallbacks = {}): Promise<void> {
  if (await isRuntimeInstalled(paths)) return;

  if (paths.devApiDir) {
    throw new Error(
      `MINCLIP_API_DIR=${paths.devApiDir} nhưng không tìm thấy python.exe/main.py. ` +
        `Dev cần thư mục api/ đầy đủ.`,
    );
  }

  const src = resolveRuntimeSource();

  // Lấy SHA256 mong đợi (ưu tiên env, sau đó tải file .sha256).
  let expectedSha256 = src.sha256;
  if (!expectedSha256 && src.sha256Url) {
    cb.onStatus?.("Đang chuẩn bị tải...");
    try {
      const text = await fetchText(src.sha256Url, cb.signal);
      expectedSha256 = parseSha256(text);
    } catch {
      expectedSha256 = null; // không có checksum → vẫn tải nhưng không verify
    }
  }

  await fsp.mkdir(paths.downloadsDir, { recursive: true });
  const zipPath = path.join(paths.downloadsDir, `min-clip-runtime-${RUNTIME_VERSION}.zip`);

  cb.onStatus?.("Đang tải dữ liệu cần thiết...");
  await downloadFile({
    url: src.zipUrl,
    destPath: zipPath,
    expectedSha256,
    onProgress: cb.onProgress,
    signal: cb.signal,
  });

  await installRuntime({
    paths,
    zipPath,
    version: RUNTIME_VERSION,
    onStatus: cb.onStatus,
  });
}

export interface RuntimeInfo {
  installed: string | null; // version đang cài (null nếu chưa)
  expected: string; // version app này mong đợi
  ready: boolean;
  devApiDir: string | null;
}

/** Thông tin runtime để hiển thị ở Settings. */
export async function getRuntimeInfo(paths: AppPaths): Promise<RuntimeInfo> {
  let installed: string | null = null;
  try {
    installed = (await fsp.readFile(paths.runtimeVersionFile, "utf-8")).trim();
  } catch {
    installed = null;
  }
  return {
    installed,
    expected: RUNTIME_VERSION,
    ready: await isRuntimeInstalled(paths),
    devApiDir: paths.devApiDir,
  };
}

/**
 * Đánh dấu để tải lại runtime ở lần khởi động kế tiếp: sao lưu config rồi xoá
 * file runtime.version. An toàn hơn tải lại ngay giữa phiên (API đang chạy).
 */
export async function markRuntimeForReinstall(paths: AppPaths): Promise<void> {
  if (paths.devApiDir) {
    throw new Error("Đang ở chế độ dev (MINCLIP_API_DIR) — không áp dụng tải lại runtime.");
  }
  await backupConfig(paths);
  await fsp.rm(paths.runtimeVersionFile, { force: true });
}
