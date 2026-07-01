# AGENTS.md

## Quy ước khi làm việc với min-clip

### Tech stack
- Electron 32 + React 18 + TypeScript 5 + Vite 5
- Tailwind CSS cho styling (KHÔNG dùng styled-components)
- Preload script dùng CommonJS (`require`); main + renderer dùng ESM/TS
- IPC định nghĩa tập trung ở `app/src/shared/ipc-channels.ts`

### Cấu trúc thư mục
- `app/src/main/` - Electron main process (Node, spawn Python API)
- `app/src/preload/` - contextBridge, expose `window.minclip`
- `app/src/renderer/` - React UI
- `app/src/shared/` - IPC channels & shared types
- `api/` - MoneyPrinterTurbo (KHÔNG sửa, đây là backend)

### Quy tắc code
- KHÔNG sửa code trong `api/`
- Mọi tính năng phải gọi qua HTTP API tới `api/MoneyPrinterTurbo`
- Luôn thêm IPC channel mới vào `shared/ipc-channels.ts` rồi mới dùng
- Preload phải giữ `// @ts-nocheck` vì dùng CommonJS `require()`
- Types cho renderer import từ `preload/types.ts` (KHÔNG phải `index.ts`)

### Lệnh build & verify
```bash
cd app
npm install              # cài deps
npm run typecheck        # typecheck 3 project (main/preload/renderer)
npm run build            # build tất cả ra dist/
npm run dev              # dev mode (tsc watch + Vite + Electron)
npm run start            # chạy từ dist/ (tự build nếu chưa có)
npm run dist             # đóng gói .exe (cần icon ở assets/icon.ico)
```

### Lưu ý quan trọng: ELECTRON_RUN_AS_NODE
Nếu máy có env `ELECTRON_RUN_AS_NODE=1` (User hoặc System), electron sẽ chạy
như Node thường, mất toàn bộ API (`app`, `BrowserWindow` = undefined).
App đã có wrapper `scripts/run-electron.cjs` tự động unset biến này trước khi
spawn electron. **LUÔN** dùng `npm run start` hoặc `npm run dev`, không gọi
`electron .` trực tiếp.

### Phân biệt các lệnh chạy
- `npm run dev` — dev với hot reload (dev tự set `MINCLIP_API_DIR=../api` → KHÔNG tải runtime)
- `npm run start` — chạy bản đã build, gần giống production
- `npm run dist` — đóng gói NSIS installer **NHỎ** (KHÔNG bundle `api/`)

### Kiến trúc runtime (v2 — QUAN TRỌNG)
Installer KHÔNG còn chứa `api/` (~2GB). Lần chạy đầu app tải payload từ
GitHub Releases rồi giải nén vào `%LOCALAPPDATA%\min-clip\runtime`.
- `app/src/main/paths.ts` — resolve layout `%LOCALAPPDATA%\min-clip\{runtime,userdata,...}`.
  Dev: nếu có env `MINCLIP_API_DIR` thì dùng thẳng thư mục đó, bỏ qua tải.
- `app/src/main/runtime-config.ts` — toạ độ GitHub Releases. **PHẢI đổi**
  `RUNTIME_REPO_OWNER`/`RUNTIME_REPO_NAME` thành repo thật. Test nhanh bằng
  env `MINCLIP_RUNTIME_URL` + `MINCLIP_RUNTIME_SHA256`.
- `app/src/main/downloader.ts` — tải có resume (`.part`) + verify SHA256.
- `app/src/main/extractor.ts` — giải nén bằng `tar.exe` (Win10 1803+), junction
  `runtime/MoneyPrinterTurbo/storage` → `userdata/storage` để giữ output khi update.
- `app/src/main/bootstrap.ts` — kiểm tra runtime đã cài chưa + điều phối tải/cài.
- Đóng gói payload: `node scripts/pack-runtime.mjs [version] [--release]`.

### API server (app/src/main/api-server.ts)
- MPT đọc `listen_host`/`listen_port` là **key TOP-LEVEL** trong `config.toml`
  (KHÔNG trong `[app]`, KHÔNG đọc env var). App tự dò cổng trống rồi ghi vào
  config.toml qua `config-toml.ts` trước khi spawn.
- Health check dùng **`GET /docs`** — MPT KHÔNG đăng ký `/ping`.
- Mọi route v1 (kể cả `stream`/`download`) đều có prefix `/api/v1`.

### Trước khi commit
- Chạy `npm run typecheck` - phải pass 0 errors
- Chạy `npm run build` - phải build thành công

### KHÔNG được
- Commit / push (người dùng tự commit)
- Sửa source trong `api/MoneyPrinterTurbo/`
- Bundle Python/ffmpeg/imagemagick/`api/` vào installer (tải từ cloud thay thế)
- Thêm code/comment không cần thiết

### Phase hiện tại (xem PLAN.md — v2)
- Phase 0 (pack-runtime), 1 (bootstrap/downloader/extractor/paths),
  2 (api-server spawn + /docs health + config inject), 3 (tray + chạy ngầm
  + single-instance) ✓
- Còn lại: Settings ghi config.toml + Setup wizard polish, updater release-aware,
  build .exe + smoke test E2E.