// Dev launcher:
//   1. tsc --watch cho main + preload (ghi ra dist/main/...)
//   2. Vite dev server cho renderer (port 5173)
//   3. Electron chạy từ dist/ với VITE_DEV_URL trỏ vào Vite
//
// Reload: khi main/preload đổi sẽ restart Electron, khi renderer đổi Vite HMR tự lo.
// Lưu ý: phải chạy qua scripts/run-electron.cjs để unset ELECTRON_RUN_AS_NODE
// (nếu set trong User env sẽ khiến electron chạy như Node thường, mất API).
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isWindows = process.platform === "win32";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const npmCmd = isWindows ? "npx.cmd" : "npx";
const nodeBin = isWindows ? "node.exe" : "node";

function runNpm(args, opts = {}) {
  // shell:true bắt buộc trên Windows + Node 18.20+ để spawn .cmd (npx.cmd)
  // không bị EINVAL (CVE-2024-27980).
  return spawn(npmCmd, args, { cwd: root, stdio: "inherit", shell: isWindows, ...opts });
}

function runNode(scriptArgs, opts = {}) {
  return spawn(nodeBin, scriptArgs, { cwd: root, stdio: "inherit", ...opts });
}

function waitForPort(port, host = "127.0.0.1", timeoutMs = 60_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const socket = new net.Socket();
      socket.setTimeout(1_000);
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      const retryOrFail = () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error("timeout"));
        else setTimeout(tick, 300);
      };
      socket.once("error", retryOrFail);
      socket.once("timeout", retryOrFail);
      socket.connect(port, host);
    };
    tick();
  });
}

let tscMain = null;
let tscPreload = null;
let vite = null;
let electron = null;

function killAll() {
  for (const p of [tscMain, tscPreload, vite, electron]) {
    try { p?.kill(); } catch {}
  }
  process.exit(0);
}
process.on("SIGINT", killAll);
process.on("SIGTERM", killAll);

(async () => {
  tscMain = runNpm(["tsc", "-p", "tsconfig.node.json", "--watch"]);
  tscPreload = runNpm(["tsc", "-p", "tsconfig.preload.json", "--watch"]);

  // Chờ tsc emit file xong
  await new Promise((r) => setTimeout(r, 4_000));

  vite = runNpm(["vite"]);
  await waitForPort(5173, "127.0.0.1", 60_000);

  electron = runNode([path.join(here, "run-electron.cjs"), "."], {
    env: {
      ...process.env,
      VITE_DEV_URL: "http://127.0.0.1:5173",
      // Dev: dùng thẳng api/ trong repo, bỏ qua việc tải runtime ~2GB.
      MINCLIP_API_DIR: path.resolve(root, "..", "api"),
    },
  });
})().catch((err) => {
  console.error(err);
  killAll();
});