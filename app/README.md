# min-clip

Windows desktop app bọc [MoneyPrinterTurbo](../api/) (FastAPI + Streamlit).
Giữ nguyên 100% thư mục `api/`, chỉ thêm lớp Electron UI phía trên.

## Tech stack

- Electron 32 + Node 24
- React 18 + TypeScript 5 + Vite 5
- Tailwind CSS + Framer Motion
- Zustand / TanStack Query / React Hook Form

## Cấu trúc

```
min-clip/
├── api/                              # MoneyPrinterTurbo (KHÔNG sửa)
│   ├── MoneyPrinterTurbo/            # FastAPI + Streamlit webui
│   ├── lib/                          # python.exe, ffmpeg, imagemagick, git
│   └── update.bat                    # git pull + pip install
├── app/                              # Electron wrapper
│   ├── src/
│   │   ├── main/                     # Electron main process (Node)
│   │   ├── preload/                  # contextBridge -> window.minclip
│   │   ├── renderer/                 # React UI
│   │   └── shared/                   # IPC channels & types
│   ├── scripts/
│   │   ├── dev.mjs                   # tsc watch + vite + electron
│   │   └── ensure-build.mjs          # tự build nếu dist/ chưa có
│   ├── assets/icon.ico
│   ├── package.json
│   ├── tsconfig.{json,node,preload,web}.json
│   └── vite.config.ts
└── docs/
    ├── API_CONTRACT.md                # Tài liệu hợp đồng API
    └── MIGRATION.md                   # Hướng dẫn cập nhật khi MPT thay đổi
```

## ⚠️ Lỗi thường gặp: app chạy nhưng không có API

Nếu máy có biến môi trường **`ELECTRON_RUN_AS_NODE=1`** (User hoặc System level), electron sẽ chạy như Node.js thường — `app`, `BrowserWindow` đều undefined và app crash ngay khi khởi động với lỗi:

```
TypeError: Cannot read properties of undefined (reading 'isPackaged')
```

**Fix:** App đã có wrapper `scripts/run-electron.cjs` tự động unset biến này. Chỉ cần LUÔN dùng:
```bash
npm run start    # KHÔNG gọi electron . trực tiếp
npm run dev      # tương tự
```

Nếu vẫn lỗi, xoá thủ công:
```powershell
[Environment]::SetEnvironmentVariable("ELECTRON_RUN_AS_NODE", $null, "User")
# Đóng tất cả terminal, mở lại
```

## Scripts

| Lệnh               | Mô tả                                                              |
|--------------------|--------------------------------------------------------------------|
| `npm install`      | Cài deps                                                           |
| `npm run dev`      | **Dev mode**: tsc --watch + Vite HMR + Electron auto-reload       |
| `npm run start`    | Chạy từ `dist/` (tự build nếu chưa có) — test bản đã build        |
| `npm run typecheck`| TypeScript typecheck 3 project                                     |
| `npm run build`    | Build tất cả (main + preload + renderer)                           |
| `npm run pack`     | Build + đóng gói thư mục portable (không tạo installer)            |
| `npm run dist`     | Build + đóng gói `.exe` NSIS installer                             |

### Khác biệt `dev` vs `start` vs `dist`

- **`npm run dev`** — Dành cho phát triển:
  - `tsc --watch` tự build lại main + preload khi sửa
  - Vite HMR tự reload renderer khi sửa React
  - Electron restart tự động khi main/preload đổi
  - Gắn với source code, dễ debug

- **`npm run start`** — Chạy bản đã build (gần giống production):
  - Dùng `dist/` đã compile
  - Renderer load từ `dist/renderer/index.html` (file tĩnh, không HMR)
  - Test trước khi đóng gói

- **`npm run dist`** — Đóng gói cuối:
  - Chạy `electron-builder` → tạo `release/min-clip-setup-1.0.0.exe`
  - `extraResources` sẽ copy toàn bộ `../api` vào installer
  - Người nhận chỉ cần cài → chạy là dùng được (python/ffmpeg/imagemagick đi kèm)

## Cách resolve đường dẫn API

App cần biết `api/` nằm ở đâu để spawn Python. Logic (trong `app/src/main/index.ts`):

```ts
function resolveApiPaths() {
  // 1. Ưu tiên env var (cho dev tùy biến)
  if (process.env.MINCLIP_API_DIR) { ... }

  // 2. Nếu đã đóng gói (NSIS installer)
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "api");
  }

  // 3. Dev / chạy từ dist: api/ nằm cùng cấp với app/
  const appDir = app.getAppPath();      // = <workspace>/app
  return path.resolve(appDir, "..", "api");   // = <workspace>/api
}
```

Có thể override bằng cách set env trước khi chạy:

```bash
# Windows PowerShell
$env:MINCLIP_API_DIR = "D:\my-custom-api"
npm run start

# Git Bash
MINCLIP_API_DIR=/d/my-custom-api npm run start
```

Khi đóng gói `.exe`, `app.isPackaged = true` → dùng `process.resourcesPath`. Người dùng cuối không cần lo về đường dẫn.

## Khi `api/update.bat` cập nhật MoneyPrinterTurbo

1. `api/update.bat` pull code mới + cài lại deps
2. Mở app → Settings → tab "Hệ thống" → bấm "So sánh hợp đồng ngay"
3. Xem `docs/API_CONTRACT.md` + `docs/MIGRATION.md` để biết cần sửa file nào trong `app/`
4. Cập nhật types/client/UI tương ứng
5. `npm run typecheck && npm run build` để verify
6. Bump `CONTRACT_VERSION` + `MIN_MPT_VERSION` trong `app/src/main/contract.ts`

## Quy ước cho Agent

- KHÔNG sửa `../api/`.
- Mọi tính năng gọi qua HTTP API tới `api/MoneyPrinterTurbo`.
- Preload phải giữ `// @ts-nocheck` vì dùng CommonJS `require()`.
- Types cho renderer import từ `preload/types.ts` (KHÔNG phải `index.ts`).
- Trước khi sửa code, chạy `npm run typecheck` để chắc chắn không lỗi TS.
- Sau khi sửa, chạy `npm run build` để verify compile.
- KHÔNG tự commit / push.