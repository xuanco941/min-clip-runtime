# Build & Phát hành min-clip — Hướng dẫn từng bước

Làm trên **Windows + PowerShell**. Có 2 thứ phát hành: **app** (file .exe nhỏ) và
**payload API** (~2GB). Người dùng cài .exe → app tự tải payload về.

---

## A. Cài 1 lần (chỉ làm lần đầu)

### 1. Cài công cụ

```powershell
# Kiểm tra Node (cần 18.20+). Đã có sẵn thì bỏ qua.
node -v

# Cài GitHub CLI rồi đăng nhập
winget install GitHub.cli
gh auth login
```

### 2. Tạo 1 repo trên GitHub (để **public**)

- `xuanco941/min-clip-runtime` → chứa **cả app (.exe + latest.yml) lẫn payload (~2GB)**.

> Mỗi version là **1 release duy nhất** (tag `v<version>`) chứa tất cả. Gọn, dễ quản lý.

### 3. Cài thư viện cho app

```powershell
cd C:\Users\xuanc\Desktop\personal\min-clip\app
npm install
```

### 4. Kiểm tra 2 file cấu hình đã đúng (mở xem 1 lần)

- `app/package.json` → mục `"version"` (vd `1.0.0`) và `build.publish`:
  ```json
  "publish": [{ "provider": "github", "owner": "xuanco941", "repo": "min-clip-runtime", "releaseType": "release" }]
  ```
- `app/src/main/runtime-config.ts`:
  ```ts
  export const RUNTIME_VERSION = "1.0.0";              // = version trong package.json
  export const RUNTIME_REPO_OWNER = "xuanco941";
  export const RUNTIME_REPO_NAME  = "min-clip-runtime";
  ```

> Cả `build.publish` (app) lẫn `runtime-config.ts` (payload) đều trỏ về **cùng repo**
> `min-clip-runtime` → app và payload nằm chung 1 release `v<version>`.

> ⚠️ **`version` (package.json) và `RUNTIME_VERSION` phải GIỐNG NHAU.** Mỗi lần lên
> đời nhớ đổi cả hai.

---

## B. Phát hành (mỗi lần ra bản mới)

### Bước 1 — Đổi số version

Sửa **`app/package.json`** → `"version"` (vd `1.0.0` → `1.0.1`) **và**
**`runtime-config.ts`** → `RUNTIME_VERSION` cho **giống nhau**.

### Bước 2 — Chạy 1 lệnh

```powershell
cd C:\Users\xuanc\Desktop\personal\min-clip
node scripts/release.mjs
```

Xong. Lệnh này tự: build app (.exe + latest.yml) → nén `api/` → **dùng `gh` upload tất cả
vào cùng release `v<version>`** ở `min-clip-runtime`.

> ✅ **KHÔNG cần `GH_TOKEN`** — chỉ cần đã `gh auth login`. `release.mjs` upload bằng `gh`
> (không để electron-builder tự publish), nên dùng luôn quyền đăng nhập sẵn có của bạn.

> **Chỉ sửa app, không đổi payload?** → `node scripts/release.mjs --skip-runtime`
> (nhanh hơn, không đẩy lại 2GB).

### Người dùng nhận cập nhật

Trong app: **Settings → Hệ thống → Cập nhật ứng dụng → Kiểm tra → Tải → Cài & khởi động lại.**

---

## C. Nếu muốn làm THỦ CÔNG (không dùng release.mjs)

Dùng `gh` (đã auth) để upload, KHÔNG cần token:

```powershell
$ver = "1.0.1"   # đổi cho khớp version

# 1) Build app (chỉ tạo file, không tự upload)
cd C:\Users\xuanc\Desktop\personal\min-clip\app
npm run build
npx electron-builder --publish never        # tạo release\*.exe + release\latest.yml

# 2) Đóng gói payload
cd ..
node scripts/pack-runtime.mjs $ver          # tạo dist-runtime\*.zip + *.zip.sha256

# 3) Tạo 1 release chứa TẤT CẢ (tên file KHÔNG có dấu cách để electron-updater không 404)
gh release create v$ver `
  "app\release\min-clip-Setup-$ver.exe" `
  "app\release\min-clip-Setup-$ver.exe.blockmap" `
  "app\release\latest.yml" `
  "dist-runtime\min-clip-runtime-$ver.zip" `
  "dist-runtime\min-clip-runtime-$ver.zip.sha256" `
  --repo xuanco941/min-clip-runtime --title "v$ver" --notes "min-clip v$ver"
```

> Nếu release đã tồn tại, đổi `gh release create` → `gh release upload v$ver <các file> --repo ... --clobber`.

---

## D. Test trước khi phát hành thật

```powershell
# Chạy dev (dùng api/ sẵn có, KHÔNG tải 2GB)
cd app
npm run dev

# Kiểm tra code không lỗi
npm run typecheck
```

**Test luồng tải payload mà chưa cần GitHub** (host file ở máy):

```powershell
# Cửa sổ 1: phục vụ file zip
cd C:\Users\xuanc\Desktop\personal\min-clip\dist-runtime
python -m http.server 8000

# Cửa sổ 2: lấy mã hash rồi mở app đã build
certutil -hashfile min-clip-runtime-1.0.0.zip SHA256
$env:MINCLIP_RUNTIME_URL = "http://localhost:8000/min-clip-runtime-1.0.0.zip"
$env:MINCLIP_RUNTIME_SHA256 = "<dán hash vừa lấy>"
cd ..\app ; npm run start
```

---

## E. Kết quả file ở đâu

| File | Vị trí |
|---|---|
| Installer .exe | `app/release/min-clip-Setup-<version>.exe` |
| Payload zip + hash | `dist-runtime/min-clip-runtime-<version>.zip(.sha256)` |

---

## F. Lỗi hay gặp

| Lỗi | Cách xử lý |
|---|---|
| `Cannot find module electron-updater` | `cd app && npm install` |
| `GitHub Personal Access Token is not set` | Đang chạy `electron-builder --publish always`. Dùng `release.mjs` (upload bằng `gh`), hoặc đổi sang `--publish never` rồi `gh release upload`. |
| `gh ... thất bại` | Chưa `gh auth login`, hoặc tài khoản không có quyền ghi repo |
| App tải payload báo **404** | `RUNTIME_VERSION` ≠ tag đã đẩy, hoặc sai owner/repo, hoặc chưa upload |
| App tải báo **SHA256 không khớp** | Đóng gói lại rồi đẩy lại cả zip + .sha256 |
| App update **404 khi tải bản mới** | Tên installer có dấu cách (GitHub đổi dấu cách → dấu chấm). Đã fix bằng `artifactName: "min-clip-Setup-${version}.${ext}"`. Phát hành lại 1 bản mới là hết. |
| App update báo **latest.yml 404** | `latest.yml` chưa được upload lên release (kiểm tra release có đủ file), hoặc sai `build.publish` |
| `spawn EINVAL` khi `npm run dev` | Đã fix sẵn; chỉ cần chạy lại |

---

## G. Biến môi trường (tham khảo)

| Biến | Khi nào dùng |
|---|---|
| `GH_TOKEN` | **Không cần** với `release.mjs` (dùng `gh`). Chỉ cần nếu tự chạy `electron-builder --publish always`. |
| `MINCLIP_API_DIR` | Dev — trỏ tới `api/` sẵn có, bỏ qua tải (`npm run dev` tự đặt). |
| `MINCLIP_RUNTIME_URL` + `MINCLIP_RUNTIME_SHA256` | Test tải payload từ nguồn khác GitHub. |
