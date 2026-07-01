// Giải nén payload zip vào runtime/ và thiết lập thư mục dữ liệu.
//
// Dùng `tar.exe` (có sẵn trên Windows 10 1803+) để giải nén zip — nhanh và
// không cần thư viện npm. Fallback sang PowerShell Expand-Archive nếu cần.

import fsp from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import type { AppPaths } from "./paths";

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { windowsHide: true });
    let err = "";
    proc.stderr?.setEncoding("utf-8");
    proc.stderr?.on("data", (d: string) => (err += d));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} thoát với mã ${code}: ${err.slice(0, 500)}`));
    });
  });
}

async function extractZip(zipPath: string, destDir: string): Promise<void> {
  await fsp.mkdir(destDir, { recursive: true });
  try {
    // bsdtar: -x extract, -f file, -C đích. Tự nhận diện định dạng zip.
    await run("tar", ["-xf", zipPath, "-C", destDir]);
    return;
  } catch (tarErr) {
    // Fallback PowerShell.
    try {
      await run("powershell", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(
          /'/g,
          "''",
        )}' -Force`,
      ]);
      return;
    } catch (psErr) {
      throw new Error(`Giải nén thất bại. tar: ${String(tarErr)}; powershell: ${String(psErr)}`);
    }
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Tạo junction (link thư mục) trỏ linkPath -> target. Bỏ qua nếu đã đúng. */
async function ensureJunction(linkPath: string, target: string): Promise<void> {
  await fsp.mkdir(target, { recursive: true });
  // Nếu linkPath đã tồn tại: nếu là thư mục thật có dữ liệu thì gộp sang target rồi xoá.
  if (await pathExists(linkPath)) {
    try {
      const st = await fsp.lstat(linkPath);
      if (st.isSymbolicLink()) return; // đã là junction
    } catch {
      // ignore
    }
    // Là thư mục thật (vd payload có sẵn) → xoá để thay bằng junction.
    await fsp.rm(linkPath, { recursive: true, force: true });
  }
  await fsp.mkdir(path.dirname(linkPath), { recursive: true });
  await fsp.symlink(target, linkPath, "junction");
}

export interface InstallOptions {
  paths: AppPaths;
  zipPath: string;
  version: string;
  onStatus?: (message: string) => void;
}

/**
 * Giải nén payload vào runtime/ (swap an toàn), thiết lập userdata, junction
 * storage, copy config, ghi runtime.version.
 */
export async function installRuntime(opts: InstallOptions): Promise<void> {
  const { paths, zipPath, version, onStatus } = opts;

  await fsp.mkdir(paths.baseDir, { recursive: true });
  await fsp.mkdir(paths.userDataDir, { recursive: true });
  await fsp.mkdir(paths.storageDir, { recursive: true });
  await fsp.mkdir(paths.materialsDir, { recursive: true });
  await fsp.mkdir(paths.logsDir, { recursive: true });

  // Giải nén vào thư mục tạm rồi swap để tránh runtime hỏng dở.
  const stagingDir = `${paths.runtimeDir}.new`;
  await fsp.rm(stagingDir, { recursive: true, force: true });
  await fsp.mkdir(stagingDir, { recursive: true });

  onStatus?.("Đang cài đặt...");
  await extractZip(zipPath, stagingDir);

  onStatus?.("Đang hoàn tất...");
  await fsp.rm(paths.runtimeDir, { recursive: true, force: true });
  await fsp.rename(stagingDir, paths.runtimeDir);

  // config.toml: khôi phục bản backup nếu có, ngược lại copy từ example.
  const examplePath = path.join(paths.mptDir, "config.example.toml");
  if (await pathExists(paths.configBackup)) {
    await fsp.copyFile(paths.configBackup, paths.configToml);
  } else if (!(await pathExists(paths.configToml)) && (await pathExists(examplePath))) {
    await fsp.copyFile(examplePath, paths.configToml);
  }

  // storage (output video) -> junction sang userdata để giữ khi update.
  await ensureJunction(path.join(paths.mptDir, "storage"), paths.storageDir);

  // Dọn file zip + .part để tiết kiệm dung lượng.
  await fsp.rm(zipPath, { force: true }).catch(() => {});
  await fsp.rm(`${zipPath}.part`, { force: true }).catch(() => {});

  await fsp.writeFile(paths.runtimeVersionFile, version, "utf-8");
}

/** Sao lưu config.toml hiện tại sang userdata (gọi khi user đổi settings). */
export async function backupConfig(paths: AppPaths): Promise<void> {
  if (await pathExists(paths.configToml)) {
    await fsp.copyFile(paths.configToml, paths.configBackup);
  }
}
