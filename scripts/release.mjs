#!/usr/bin/env node
// Phát hành MỘT bản mới cho CẢ app (vỏ Electron) lẫn payload API trong 1 lệnh.
//
// Cách dùng (từ thư mục gốc repo):
//   node scripts/release.mjs [--skip-runtime] [--runtime-repo <owner/name>]
//
// KHÔNG cần GH_TOKEN — chỉ cần đã `gh auth login`. Quy trình:
//   1) Build app (electron-builder --publish never) → tạo .exe + latest.yml (KHÔNG upload).
//   2) (trừ --skip-runtime) Đóng gói payload api/ → zip + sha256.
//   3) Dùng `gh` (auth sẵn có) upload TẤT CẢ vào 1 release tag v<version>.
//
// YÊU CẦU: gh CLI đã đăng nhập, Windows 10 1803+ (tar.exe), Node 18.20+.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const appDir = path.join(repoRoot, "app");
const releaseDir = path.join(appDir, "release");
const distRuntime = path.join(repoRoot, "dist-runtime");
const isWindows = process.platform === "win32";

const args = process.argv.slice(2);
const skipRuntime = args.includes("--skip-runtime");
const rtRepoIdx = args.indexOf("--runtime-repo");
const repo = rtRepoIdx >= 0 ? args[rtRepoIdx + 1] : "xuanco941/min-clip-runtime";

const pkg = JSON.parse(fs.readFileSync(path.join(appDir, "package.json"), "utf-8"));
const version = pkg.version;
const tag = `v${version}`;

function log(m) { console.log(`\x1b[35m[release]\x1b[0m ${m}`); }
function fail(m) { console.error(`\x1b[31m[release] ${m}\x1b[0m`); process.exit(1); }

// npm/npx là .cmd trên Windows → cần shell:true (tránh EINVAL).
function runShell(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { stdio: "inherit", shell: isWindows, ...opts });
  if (r.status !== 0) fail(`Lệnh thất bại: ${cmd} ${cmdArgs.join(" ")}`);
}
// gh / node là .exe → KHÔNG dùng shell (để tên file có dấu cách không bị vỡ).
function runExe(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { stdio: "inherit", ...opts });
  if (r.status !== 0) fail(`Lệnh thất bại: ${cmd} ${cmdArgs.join(" ")}`);
  return r;
}
function tryExe(cmd, cmdArgs, opts = {}) {
  return spawnSync(cmd, cmdArgs, { stdio: "ignore", ...opts });
}

log(`Phát hành ${tag}`);

// --- Bước 1: build app (KHÔNG upload) ---
log("Bước 1/3: build app (electron-builder --publish never)...");
runShell(isWindows ? "npm.cmd" : "npm", ["run", "build"], { cwd: appDir });
runShell(isWindows ? "npx.cmd" : "npx", ["electron-builder", "--publish", "never"], { cwd: appDir });

// Thu thập file app: .exe, latest.yml, .blockmap
if (!fs.existsSync(releaseDir)) fail(`Không thấy ${releaseDir} sau khi build.`);
const appFiles = fs
  .readdirSync(releaseDir)
  // latest.yml luôn lấy; .exe/.blockmap chỉ lấy đúng version (tránh file cũ còn sót).
  .filter((f) => f === "latest.yml" || ((f.endsWith(".exe") || f.endsWith(".blockmap")) && f.includes(version)))
  .map((f) => path.join(releaseDir, f));
if (!appFiles.some((f) => f.endsWith(".exe"))) fail("Không thấy file .exe trong release/.");
if (!appFiles.some((f) => f.endsWith("latest.yml")))
  log("⚠️  Không thấy latest.yml — electron-updater sẽ không hoạt động. Kiểm tra build.publish.");

// --- Bước 2: đóng gói payload (chỉ tạo file, KHÔNG tự release) ---
let rtFiles = [];
if (skipRuntime) {
  log("Bỏ qua payload (--skip-runtime).");
} else {
  log("Bước 2/3: đóng gói payload API (~vài phút)...");
  runExe("node", [path.join("scripts", "pack-runtime.mjs"), version], { cwd: repoRoot });
  const zip = path.join(distRuntime, `min-clip-runtime-${version}.zip`);
  const sha = `${zip}.sha256`;
  for (const f of [zip, sha]) {
    if (!fs.existsSync(f)) fail(`Không thấy ${f} sau khi đóng gói.`);
    rtFiles.push(f);
  }
}

// --- Bước 3: upload tất cả lên 1 release qua gh (dùng auth sẵn có) ---
const allFiles = [...appFiles, ...rtFiles];
log(`Bước 3/3: tải ${allFiles.length} file lên release ${tag} (${repo}) bằng gh...`);

// Preflight: repo có tồn tại + có commit (default branch) không?
const repoView = spawnSync("gh", ["repo", "view", repo, "--json", "defaultBranchRef"], { encoding: "utf-8" });
if (repoView.status !== 0) {
  fail(
    `Không truy cập được repo ${repo}.\n` +
      `  • Tạo repo PUBLIC này trên GitHub trước, hoặc\n` +
      `  • Kiểm tra 'gh auth status' (cần quyền ghi repo).\n` +
      `Lỗi gh: ${(repoView.stderr || "").trim()}`,
  );
}
try {
  const info = JSON.parse(repoView.stdout || "{}");
  if (!info.defaultBranchRef) {
    fail(
      `Repo ${repo} đang RỖNG (chưa có commit) nên không tạo được release.\n` +
        `  → Vào GitHub repo ${repo} → bấm "Add a README" (tạo 1 commit) → chạy lại lệnh.`,
    );
  }
} catch {
  // bỏ qua nếu parse lỗi — vẫn thử tạo release.
}

const exists = tryExe("gh", ["release", "view", tag, "--repo", repo]);
if (exists.status === 0) {
  log("Release đã tồn tại — upload (ghi đè) assets...");
  runExe("gh", ["release", "upload", tag, ...allFiles, "--repo", repo, "--clobber"]);
} else {
  log("Tạo release mới...");
  runExe("gh", [
    "release", "create", tag, ...allFiles,
    "--repo", repo,
    "--title", tag,
    "--notes", `min-clip ${tag} — app (.exe + latest.yml)${skipRuntime ? "" : " + payload runtime"}.`,
  ]);
}

log(`Hoàn tất. Release ${tag} ở ${repo} đã có app${skipRuntime ? "" : " + payload"}.`);
log("Người dùng: Settings → Cập nhật ứng dụng → Kiểm tra → Tải → Cài & khởi động lại.");
