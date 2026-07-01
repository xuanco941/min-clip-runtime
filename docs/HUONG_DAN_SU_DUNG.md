# Hướng dẫn sử dụng min-clip

Tài liệu dành cho **người dùng cuối** và người vận hành. Phần build/phát hành xem
[BUILD_PHAT_HANH.md](BUILD_PHAT_HANH.md).

---

## 1. Cài đặt

1. Tải `min-clip-setup-<phiên bản>.exe` (hoặc `min-clip Setup <ver>.exe`).
2. Chạy file, làm theo trình cài đặt (chọn thư mục cài nếu muốn).
3. Mở **min-clip** từ Start Menu / shortcut.

> **Yêu cầu hệ thống:** Windows 10 (1803+) hoặc Windows 11, 64-bit. Cần khoảng
> **5 GB trống** (2 GB tải về + 2 GB giải nén + dung lượng video tạo ra).

### Lần chạy đầu — tải runtime (~2 GB)

Lần đầu mở app, min-clip sẽ **tự tải gói runtime** (Python + FFmpeg + ImageMagick
+ mã nguồn xử lý video) từ GitHub Releases:

- Màn hình khởi động hiển thị **tiến độ tải + tốc độ**.
- Nếu mạng đứt giữa chừng, bấm **Thử lại** — app **tải tiếp** từ chỗ dở (không tải lại từ đầu).
- Tải xong, app tự kiểm tra toàn vẹn (SHA256), giải nén rồi khởi động.

Các lần sau mở app sẽ vào thẳng giao diện (không tải lại).

> Cần mạng để tải lần đầu. Nếu công ty chặn GitHub, xem mục
> "Tải runtime trong mạng nội bộ" ở [BUILD_PHAT_HANH.md](BUILD_PHAT_HANH.md).

---

## 2. Dữ liệu được lưu ở đâu

Toàn bộ nằm trong `%LOCALAPPDATA%\min-clip\` (gõ `%LOCALAPPDATA%` vào thanh địa chỉ Explorer):

```
%LOCALAPPDATA%\min-clip\
├── runtime\          # Python/FFmpeg/ImageMagick + mã nguồn (TẢI VỀ — ghi đè khi cập nhật)
├── userdata\         # DỮ LIỆU CỦA BẠN — luôn được GIỮ khi cập nhật
│   ├── storage\      #   video đã tạo + cache tải về
│   ├── materials\    #   video/ảnh bạn upload (nguồn "local")
│   └── config.backup.toml   # bản sao cấu hình
├── downloads\        # file tạm khi đang tải runtime
├── logs\             # log
└── runtime.version   # phiên bản runtime đang cài
```

> **Quan trọng:** Video và cấu hình của bạn nằm trong `userdata\`, **không bị mất**
> khi app cập nhật/tải lại runtime.

---

## 3. Giao diện & chức năng

| Trang | Chức năng |
|---|---|
| **Home** | Tạo video: nhập chủ đề → sinh kịch bản/keyword (AI) → chọn nguồn video, giọng đọc, phụ đề → **Tạo video** |
| **Tasks** | Danh sách tác vụ + tiến độ (PROCESSING/COMPLETE/FAILED), xoá, mở thư mục |
| **Library** | Thư viện video đã tạo, xem trước, tải xuống |
| **Materials** | Quản lý video/ảnh local (dùng khi nguồn video = "local") |
| **BGM** | Quản lý nhạc nền |
| **Tools** | Sinh kịch bản / keyword / metadata mạng xã hội riêng lẻ |
| **Settings** | Cấu hình API key, model, hệ thống, cập nhật (xem mục 5) |

### Chạy ngầm (system tray)

- **Đóng cửa sổ (nút X)** = app **thu nhỏ xuống khay hệ thống** (tray), API Python
  **vẫn chạy** — tác vụ tạo video không bị gián đoạn.
- Click biểu tượng tray để **mở lại** cửa sổ.
- Menu tray (chuột phải): *Mở min-clip / Khởi động lại API / **Thoát***.
- Chỉ **"Thoát"** mới thực sự tắt API Python và đóng app.
- Mở app lần 2 khi đang chạy → focus cửa sổ đang mở (không mở trùng).

---

## 4. Tạo video (Home) — các bước

1. Nhập **chủ đề video** (video subject).
2. (Tuỳ chọn) bấm **sinh kịch bản & keyword** bằng AI — cần đã cấu hình LLM (mục 5.1).
3. Chọn **nguồn video**: `pexels` / `pixabay` / `coverr` (cần API key, mục 5.2) hoặc `local` (dùng Materials).
4. Chọn **tỉ lệ** (9:16 dọc / 16:9 ngang / 1:1), thời lượng clip, số lượng video.
5. Chọn **giọng đọc** (TTS) — mục 5.3.
6. Bật/tắt & chỉnh **phụ đề** (font, vị trí, màu, viền…).
7. Bấm **Tạo video** → theo dõi ở trang **Tasks** → xem kết quả ở **Library**.

---

## 5. Thiết lập cấu hình (Settings)

Mọi thay đổi ở Settings được ghi vào `config.toml` của runtime **và** sao lưu sang
`userdata\config.backup.toml` (để khôi phục khi tải lại runtime). Bấm **Lưu** ở mỗi
mục để áp dụng. Một số thay đổi (host/port) cần **Khởi động lại API**.

> API key chỉ lưu cục bộ trong `config.toml`, không gửi đi đâu ngoài nhà cung cấp bạn chọn.

### 5.1. Tab LLM — Trí tuệ nhân tạo sinh kịch bản/keyword

- **Provider mặc định**: chọn nhà cung cấp (`openai`, `gemini`, `deepseek`,
  `qwen`, `moonshot`, `azure`, `grok`, `groq`, `ollama`, `mimo`, `minimax`,
  `pollinations`, `litellm`, …).
- **API Key / Base URL / Model Name**: điền theo provider đã chọn (ô tự đổi theo provider).
  - `azure`: thêm **API Version**.
  - `cloudflare`: thêm **Account ID**.
  - `ernie`: thêm **Secret Key**.
- Lưu vào `[app]`: `llm_provider`, `<provider>_api_key`, `<provider>_base_url`, `<provider>_model_name`.

### 5.2. Tab Nguồn video — Stock video API key

- **Pexels / Pixabay / Coverr API Key**: có thể nhập **nhiều key cách nhau bằng dấu phẩy** (tránh giới hạn rate-limit).
- Lưu vào `[app]`: `pexels_api_keys`, `pixabay_api_keys`, `coverr_api_keys` (dạng mảng).

### 5.3. Tab TTS — Giọng đọc

- **Azure Speech Region / Key** (nếu dùng Azure TTS) → `[azure].speech_region`, `[azure].speech_key`.
- **SiliconFlow API Key** → `[siliconflow].api_key`.
- **Subtitle provider**: `edge` (Azure TTS V1, mặc định) hoặc `whisper` → `[app].subtitle_provider`.

### 5.4. Tab Phụ đề — Whisper (phụ đề nâng cao)

Chỉ dùng khi `subtitle_provider = whisper`:
- **Model** (`tiny`…`large-v3`), **Device** (`CPU`/`cuda`), **Compute type** (`int8`…`float32`).
- Lưu vào `[whisper]`: `model_size`, `device`, `compute_type`.

### 5.5. Tab Upload-Post — Đăng tự động TikTok/Instagram/YouTube

- **Bật tự động đăng**, **API Key**, **Username**, **Nền tảng** (cách nhau bằng dấu phẩy).
- Lưu vào `[ui]`: `upload_post_enabled`, `upload_post_api_key`, `upload_post_username`, `upload_post_platforms`.

### 5.6. Tab Hệ thống

- **Runtime payload**: xem phiên bản runtime đang cài / app mong đợi; nút **Tải lại runtime**
  (đánh dấu để tải lại ở lần mở kế tiếp — dữ liệu trong `userdata` được giữ).
- **Hợp đồng API**: so sánh endpoint app mong đợi với API thật (sau khi update MoneyPrinterTurbo).
- **Cập nhật MoneyPrinterTurbo**: `git pull` + cài lại dependencies (cập nhật mã nguồn xử lý video).
- **Listen Host / Port**: cổng API (app tự dò cổng trống nếu bị chiếm) → key top-level `listen_host`, `listen_port`.
- **Max concurrent / queued tasks** → `[app].max_concurrent_tasks`, `[app].max_queued_tasks`.
- **FFmpeg / ImageMagick path**: tự động trỏ vào `runtime\lib\…` (thường không cần sửa).
- Nút **Khởi động lại API** để áp dụng host/port mới.

---

## 6. Bảng tham chiếu nhanh khoá `config.toml`

| Khoá | Mục (section) | Ý nghĩa |
|---|---|---|
| `listen_host`, `listen_port` | (top-level) | Host/cổng API. **Lưu ý: là khoá top-level, KHÔNG trong `[app]`.** |
| `llm_provider` | `[app]` | Nhà cung cấp LLM mặc định |
| `<provider>_api_key/_base_url/_model_name` | `[app]` | Khoá/URL/model theo provider |
| `pexels_api_keys`, `pixabay_api_keys`, `coverr_api_keys` | `[app]` | Mảng API key nguồn video |
| `subtitle_provider` | `[app]` | `edge` hoặc `whisper` |
| `material_directory` | `[app]` | Thư mục lưu material (app trỏ vào `userdata\materials`) |
| `max_concurrent_tasks`, `max_queued_tasks` | `[app]` | Giới hạn tác vụ |
| `ffmpeg_path`, `imagemagick_path` | `[app]` | Đường dẫn binary (app tự đặt) |
| `model_size`, `device`, `compute_type` | `[whisper]` | Cấu hình Whisper |
| `speech_key`, `speech_region` | `[azure]` | Azure Speech |
| `api_key` | `[siliconflow]` | SiliconFlow |
| `hide_log`, `upload_post_*` | `[ui]` | UI & Upload-Post |

> Có thể sửa trực tiếp `runtime\MoneyPrinterTurbo\config.toml` rồi **Khởi động lại API**,
> nhưng nên dùng Settings để đồng bộ bản sao lưu.

---

## 7. Khắc phục sự cố

| Triệu chứng | Cách xử lý |
|---|---|
| Kẹt ở màn hình tải runtime | Kiểm tra mạng/GitHub; bấm **Thử lại** (tải tiếp từ chỗ dở) |
| "API không phản hồi sau …s" | Mở mục **Nhật ký** ở màn hình khởi động để xem lỗi Python; thường do thiếu cấu hình. Xem `%LOCALAPPDATA%\min-clip\logs` |
| Tạo video báo lỗi nguồn video | Kiểm tra **Pexels/Pixabay/Coverr API Key** (tab Nguồn video) |
| AI không sinh được kịch bản | Kiểm tra **LLM API Key/Model** (tab LLM) |
| Cổng bị chiếm | App tự dò cổng `8080–8099`; nếu vẫn lỗi, đổi **Listen Port** rồi khởi động lại API |
| Muốn cài lại sạch | Thoát app, xoá `%LOCALAPPDATA%\min-clip` (sẽ mất video trong `userdata\storage`!), mở lại app để tải lại |
| Đường dẫn user có dấu tiếng Việt | Dữ liệu mặc định ở `%LOCALAPPDATA%` (ASCII) nên thường ổn |

### Lấy log

- Log Python & app: `%LOCALAPPDATA%\min-clip\logs`
- Trong app: màn hình khởi động có mục **"Nhật ký"** hiển thị stdout/stderr của API.
