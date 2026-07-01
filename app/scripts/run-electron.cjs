// Wrapper chạy electron đảm bảo unset ELECTRON_RUN_AS_NODE
// (vì biến này nếu set = "1" sẽ bắt electron chạy như Node thường, mất toàn bộ API)
// Khi User env có sẵn biến này, npm run start sẽ fail. Script này fix bằng cách
// xoá khỏi process.env trước khi spawn.
const { spawn } = require("node:child_process");
const path = require("node:path");

delete process.env.ELECTRON_RUN_AS_NODE;
// Một số máy còn set ELECTRON_NO_ATTACH_CONSOLE=1 v.v. — không xoá, để nguyên
// vì không ảnh hưởng main process API.

const electronBin = require("electron");
const args = process.argv.slice(2);

const child = spawn(electronBin, args, {
  stdio: "inherit",
  env: process.env,
  windowsHide: false,
});

child.on("close", (code, signal) => {
  if (code === null) {
    console.error(`[run-electron] exited with signal ${signal}`);
    process.exit(1);
  }
  process.exit(code);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig);
  });
}
