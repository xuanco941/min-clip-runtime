// Auto-build nếu dist/ chưa có. Cho phép `npm run start` chạy được ngay cả khi
// người dùng chưa build lần nào.
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const distMain = path.join(root, "dist", "main", "main", "index.js");
const distRenderer = path.join(root, "dist", "renderer", "index.html");

if (existsSync(distMain) && existsSync(distRenderer)) {
  console.log("[min-clip] dist/ đã có sẵn, bỏ qua build.");
  process.exit(0);
}

console.log("[min-clip] dist/ chưa có → đang build (lần đầu có thể mất 1-2 phút)...");
const isWindows = process.platform === "win32";
const result = spawnSync(
  isWindows ? "npm.cmd" : "npm",
  ["run", "build"],
  // shell:true để spawn .cmd không bị EINVAL trên Node 18.20+ (Windows).
  { cwd: root, stdio: "inherit", shell: isWindows },
);
process.exit(result.status ?? 0);