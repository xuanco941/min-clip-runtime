# min-clip

Ứng dụng Windows desktop bọc [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo)
(FastAPI) — tạo video ngắn bằng AI với giao diện native, chạy API Python **ngầm**.

### Clone https://github.com/harry0703/MoneyPrinterTurbo đổi tên thành /api cùng folder /app sau đó chạy update.bat

## Điểm khác biệt kiến trúc

Installer **NHỎ** (~80 MB), KHÔNG nhồi `api/` (~2 GB) vào file `.exe`. Lần chạy
đầu, app **tự tải runtime payload từ GitHub Releases**, kiểm tra SHA256, giải nén
vào `%LOCALAPPDATA%\min-clip\runtime` rồi khởi động API.

```
Cài min-clip-setup.exe  (nhỏ)
        │  lần chạy đầu
        ▼
Tải min-clip-runtime-<ver>.zip (GitHub Releases) → verify SHA256 → giải nén
        ▼
%LOCALAPPDATA%\min-clip\runtime\   (python + ffmpeg + imagemagick + MoneyPrinterTurbo)
        ▼  mỗi lần mở
Dò cổng trống → ghi config.toml → chạy python main.py (ngầm) → UI gọi API qua HTTP
```

## Tài liệu

| Tài liệu | Nội dung |
|---|---|
| [docs/HUONG_DAN_SU_DUNG.md](docs/HUONG_DAN_SU_DUNG.md) | Cài đặt, sử dụng, **tất cả thiết lập config** của app |
| [docs/BUILD_PHAT_HANH.md](docs/BUILD_PHAT_HANH.md) | Setup dev, **build .exe**, **cách đẩy `api/` lên GitHub Releases** để app tự tải |
| [AGENTS.md](AGENTS.md) | Quy ước kỹ thuật cho dev/agent |
| [PLAN.md](PLAN.md) | Kế hoạch & kiến trúc (v2) |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | Bản đồ endpoint API ↔ UI |

## Bắt đầu nhanh (dev)

```bash
cd app
npm install
npm run dev      # dùng api/ sẵn có trong repo, KHÔNG tải 2GB
```

## Build + phát hành (tóm tắt)

```bash
# 1) Đổi RUNTIME_REPO_OWNER/RUNTIME_REPO_NAME trong app/src/main/runtime-config.ts
# 2) Đóng gói payload + tạo GitHub Release:
node scripts/pack-runtime.mjs 1.3.0 --release
# 3) Build installer nhỏ:
cd app && npm run dist        # → app/release/min-clip Setup <ver>.exe
```

Chi tiết: xem [docs/BUILD_PHAT_HANH.md](docs/BUILD_PHAT_HANH.md).
