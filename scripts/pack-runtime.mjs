#!/usr/bin/env node
// Đóng gói payload runtime (~2GB) thành zip + sha256 để upload lên GitHub Releases.
//
// Cách dùng:
//   node scripts/pack-runtime.mjs [version] [--release]
//
//   version    : phiên bản payload (mặc định 1.0.0, khớp RUNTIME_VERSION)
//   --release  : sau khi nén, tạo GitHub Release và upload (cần `gh` đã đăng nhập)
//
// Yêu cầu: Windows 10 1803+ (có tar.exe / bsdtar). Chạy từ thư mục gốc repo.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const apiDir = path.join(repoRoot, "api");
const outDir = path.join(repoRoot, "dist-runtime");

const args = process.argv.slice(2);
const doRelease = args.includes("--release");
// Repo chứa payload (KHÁC repo app). Mặc định khớp runtime-config.ts.
// Đổi bằng: --repo <owner/name>
let repo = "xuanco941/min-clip-runtime";
const positionals = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--repo") {
    repo = args[++i];
    continue;
  }
  if (args[i].startsWith("--")) continue;
  positionals.push(args[i]);
}
const version = positionals[0] || "1.0.0";

const zipName = `min-clip-runtime-${version}.zip`;
const zipPath = path.join(outDir, zipName);
const shaPath = `${zipPath}.sha256`;

function fail(msg) {
  console.error(`\x1b[31m[pack-runtime] ${msg}\x1b[0m`);
  process.exit(1);
}

function log(msg) {
  console.log(`\x1b[36m[pack-runtime]\x1b[0m ${msg}`);
}

// --- Kiểm tra đầu vào ---
if (!fs.existsSync(apiDir)) fail(`Không thấy thư mục api/ tại ${apiDir}`);
if (!fs.existsSync(path.join(apiDir, "lib"))) fail("Không thấy api/lib");
if (!fs.existsSync(path.join(apiDir, "MoneyPrinterTurbo"))) fail("Không thấy api/MoneyPrinterTurbo");

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(zipPath, { force: true });
fs.rmSync(shaPath, { force: true });

// --- Nén bằng bsdtar (tar.exe trên Windows tạo zip qua -a theo đuôi .zip) ---
log(`Đang nén api/ -> ${zipName} (có thể mất vài phút, ~2GB)...`);
const excludes = [
  "--exclude=MoneyPrinterTurbo/storage/tasks",
  "--exclude=MoneyPrinterTurbo/storage/cache_videos",
  "--exclude=*/__pycache__/*",
  "--exclude=*.pyc",
  "--exclude=*.pyo",
  "--exclude=*/.pytest_cache/*",
  "--exclude=*/.mypy_cache/*",
  "--exclude=*/.ruff_cache/*",
];
// Giữ lại MoneyPrinterTurbo/.git để tính năng cập nhật qua `git pull` hoạt động.
const tarArgs = ["-a", "-c", "-f", zipPath, "-C", apiDir, ...excludes, "lib", "MoneyPrinterTurbo"];
const tar = spawnSync("tar", tarArgs, { stdio: "inherit" });
if (tar.status !== 0) fail(`tar thất bại (mã ${tar.status}). Cần Windows 10 1803+ có tar.exe.`);
if (!fs.existsSync(zipPath)) fail("Không tạo được file zip.");

const sizeMB = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
log(`Đã tạo ${zipName} (${sizeMB} MB)`);

// --- Tính SHA256 ---
log("Đang tính SHA256...");
const sha = await new Promise((resolve, reject) => {
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(zipPath);
  stream.on("data", (d) => hash.update(d));
  stream.on("error", reject);
  stream.on("end", () => resolve(hash.digest("hex")));
});
fs.writeFileSync(shaPath, `${sha}  ${zipName}\n`, "utf-8");
log(`SHA256: ${sha}`);
log(`Đã ghi ${path.basename(shaPath)}`);

// --- Tạo GitHub Release (tuỳ chọn) ---
const isWindows = process.platform === "win32";
function gh(ghArgs) {
  return spawnSync("gh", ghArgs, { stdio: "inherit", shell: isWindows });
}

if (doRelease) {
  // Dùng chung tag `v<version>` với release app (electron-builder).
  const tag = `v${version}`;
  log(`Phát hành ${tag} lên repo ${repo}...`);

  // Release đã tồn tại? → upload --clobber. Chưa? → create.
  const exists = gh(["release", "view", tag, "--repo", repo]);
  let res;
  if (exists.status === 0) {
    log("Release đã tồn tại — upload (ghi đè) assets...");
    res = gh(["release", "upload", tag, zipPath, shaPath, "--repo", repo, "--clobber"]);
  } else {
    log("Tạo release mới...");
    res = gh([
      "release", "create", tag, zipPath, shaPath,
      "--repo", repo,
      "--title", `Runtime payload v${version}`,
      "--notes", `min-clip runtime payload (python + ffmpeg + imagemagick + MoneyPrinterTurbo). SHA256: ${sha}`,
    ]);
  }
  if (res.status !== 0) fail(`gh thất bại (repo ${repo}). Kiểm tra 'gh auth status' và quyền ghi repo.`);
  log(`Đã phát hành ${tag} → ${repo}.`);
} else {
  log(`Xong. Upload thủ công 2 file sau lên repo ${repo} (tag v${version}):`);
  log(`  ${zipPath}`);
  log(`  ${shaPath}`);
  log("Hoặc chạy lại với cờ --release (thêm --repo <owner/name> nếu khác mặc định).");
}
