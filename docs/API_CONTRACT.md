# min-clip — Tài liệu hợp đồng API (API Contract)

> **Mục đích**: Tài liệu này là "bản đồ" giữa `api/MoneyPrinterTurbo/` (upstream) và
> `app/` (Electron wrapper). Mỗi khi chạy `api/update.bat` (git pull + pip install),
> đọc tài liệu này để biết cần sửa/cập nhật những file nào trong Electron.

## 0. Quy trình cập nhật khi upstream MPT thay đổi

```
1. Chạy api/update.bat                    → pull code mới + cài lại deps
2. Đọc api/MoneyPrinterTurbo/CHANGELOG*   → xem breaking changes
3. So sánh với file này (API_CONTRACT.md) → biết field/endpoint nào đổi
4. Cập nhật tương ứng trong app/:
   a. app/src/renderer/lib/api-types.ts   (cập nhật types)
   b. app/src/renderer/lib/api.ts         (cập nhật client nếu có endpoint mới)
   c. app/src/renderer/lib/store.ts       (cập nhật React Query hooks)
   d. app/src/main/contract.ts            (cập nhật MACHINE_VERSION, EXPECTED_*)
   e. app/src/renderer/pages/*            (cập nhật UI nếu field mới)
5. Chạy npm run typecheck && npm run build → đảm bảo 0 lỗi
6. Cập nhật số MIN_MPT_VERSION trong app/src/main/contract.ts
```

Trong app có **2 cơ chế tự phát hiện mismatch** (xem mục 9):
- Khởi động: so sánh `project_version` (từ config) với `MIN_MPT_VERSION` trong contract
- Nút "So sánh hợp đồng" trong Settings: lấy `/openapi.json` từ API đang chạy, đối chiếu với contract

---

## 1. Cấu hình hệ thống

| Thứ | Giá trị | Nguồn |
|-----|---------|-------|
| Host | `127.0.0.1` | `start.bat` (MPT_WEBUI_HOST) |
| Port range | `8081` → tìm trống trong `8081..8199` | `start.bat` + `min-clip/src/main/api-server.ts` |
| Base URL dev | `http://127.0.0.1:<port>` | runtime |
| Base URL packaged | `http://127.0.0.1:<port>` (vẫn localhost) | runtime |
| API prefix | `/api/v1` | `app/controllers/v1/base.py` |
| Health check | `GET /ping` (không prefix) | `app/controllers/ping.py` |
| Tài liệu OpenAPI | `GET /openapi.json`, `GET /docs` | FastAPI tự sinh |
| Tài liệu ReDoc | `GET /redoc` | FastAPI tự sinh |

---

## 2. Bảng endpoint đầy đủ

### 2.1. Health check

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/ping` |
| Auth | none |
| Request | none |
| Response 200 | `string` → `"pong"` |
| Dùng ở | `app/src/main/api-server.ts:waitForPing()`, `app/src/renderer/lib/store.ts:usePing` |
| UI | Splash screen (khi khởi động) + Settings (ping button) |

### 2.2. Tạo video

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/v1/videos` |
| Auth | none (token có thể bật qua `api_key` trong config) |
| Request | `TaskVideoRequest` = toàn bộ `VideoParams` |
| Response 200 | `TaskResponse { data: { task_id: string } }` |
| Side effects | Tạo folder `storage/tasks/<task_id>/` |
| Dùng ở | `app/src/renderer/pages/Home.tsx`, `app/src/renderer/lib/store.ts:useCreateVideo` |
| UI | Trang "Tạo video", nút "Tạo video ngay" |

### 2.3. Tạo phụ đề (chỉ phụ đề, không render video)

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/v1/subtitle` |
| Request | `SubtitleRequest` (không có `video_subject`, `video_aspect`, `video_source=local`) |
| Response 200 | `TaskResponse { data: { task_id } }` |
| Dùng ở | CHƯA dùng trong UI (để dành cho Phase sau) |
| Ghi chú | Có thể mở rộng thêm nút "Tạo phụ đề từ kịch bản có sẵn" trong Home |

### 2.4. Tạo audio (chỉ TTS, không video)

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/v1/audio` |
| Request | `AudioRequest` |
| Response 200 | `TaskResponse { data: { task_id } }` |
| Dùng ở | CHƯA dùng trong UI |
| Ghi chú | Có thể thêm "Preview giọng đọc" nâng cao |

### 2.5. Liệt kê tác vụ (phân trang)

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/v1/tasks` |
| Query | `page: int ≥ 1` (mặc định 1), `page_size: int ≥ 1` (mặc định 10) |
| Response 200 | `TaskQueryResponse { data: { tasks: TaskData[], total, page, page_size } }` |
| Dùng ở | `app/src/renderer/lib/store.ts:useTasks`, `app/src/renderer/pages/Tasks.tsx`, `Library.tsx` |
| UI | Trang "Tác vụ" (polling 5s), "Thư viện" (lấy video đã hoàn thành) |

### 2.6. Chi tiết tác vụ

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/v1/tasks/{task_id}` |
| Path param | `task_id: UUID` |
| Response 200 | `TaskQueryResponse { data: TaskData }` — `videos[]` được rewrite thành absolute URL |
| Response 404 | `HttpException` |
| Dùng ở | `app/src/renderer/lib/store.ts:useTask`, `app/src/renderer/pages/Tasks.tsx` (modal) |
| UI | Modal chi tiết trong Tasks |

### 2.7. Xoá tác vụ

| Field | Value |
|-------|-------|
| Method | `DELETE` |
| Path | `/api/v1/tasks/{task_id}` |
| Side effects | `shutil.rmtree(storage/tasks/<task_id>)` + xoá khỏi state |
| Response 200 | `TaskDeletionResponse` |
| Dùng ở | `app/src/renderer/lib/store.ts:useDeleteTask` |
| UI | Nút "Xoá" trong Tasks + Library |

### 2.8. Liệt kê BGM

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/v1/musics` |
| Response 200 | `BgmRetrieveResponse { data: { files: BgmFile[] } }` |
| BgmFile | `{ name, size, file }` — chỉ tên file, không path tuyệt đối |
| Dùng ở | `app/src/renderer/lib/store.ts:useBgmList`, `app/src/renderer/pages/BGM.tsx`, `Home.tsx` (BGM) |
| UI | Trang "Nhạc nền" |

### 2.9. Upload BGM

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/v1/musics` |
| Form | `file: mp3` |
| Validate | Chỉ nhận `.mp3` (lowercase) |
| Lưu tại | `resource/songs/<file>` |
| Response 200 | `BgmUploadResponse { data: { file: filename } }` |
| Dùng ở | `app/src/renderer/lib/store.ts:useUploadBgm` |
| UI | Trang "Nhạc nền" |

### 2.10. Liệt kê local video materials

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/v1/video_materials` |
| Allowed ext | `mp4, mov, avi, flv, mkv, jpg, jpeg, png` |
| Sort | Theo tên file (case-insensitive) |
| Response 200 | `VideoMaterialRetrieveResponse { data: { files } }` |
| Dùng ở | `app/src/renderer/lib/store.ts:useMaterialList` |
| UI | Trang "Materials" |

### 2.11. Upload local video materials

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/v1/video_materials` |
| Form | `file` |
| Validate | ext trong allowed list |
| Lưu tại | `storage/local_videos/<file>` |
| Dùng ở | `app/src/renderer/lib/store.ts:useUploadMaterial` |
| UI | Trang "Materials" |

### 2.12. Stream video (cho player trong app)

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/stream/{file_path:path}` |
| Security | Resolve path phải nằm trong `storage/tasks/` (chống path traversal) |
| Headers | Hỗ trợ `Range: bytes=X-Y` cho seek |
| Response 200/206 | Video stream (`video/mp4`) |
| Dùng ở | `app/src/renderer/lib/api.ts:api.streamUrl`, `app/src/renderer/pages/Library.tsx` |
| UI | `<video src={streamUrl}>` trong Library modal |

### 2.13. Download video

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/download/{file_path:path}` |
| Response | `FileResponse` với `Content-Disposition: attachment` |
| Dùng ở | `app/src/renderer/lib/api.ts:api.downloadUrl`, `app/src/renderer/pages/Library.tsx` (nút "Tải") |

### 2.14. Tạo kịch bản (LLM only)

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/v1/scripts` |
| Request | `VideoScriptRequest { video_subject, video_language?, paragraph_number?, video_script_prompt?, custom_system_prompt? }` |
| Response 200 | `VideoScriptResponse { data: { video_script: string } }` |
| Dùng ở | `app/src/renderer/lib/store.ts:useGenerateScript`, `Home.tsx`, `Tools.tsx` |
| UI | Nút "Tạo kịch bản + từ khoá" trong Home; Tools → Script Generator |

### 2.15. Tạo từ khoá (LLM only)

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/v1/terms` |
| Request | `VideoTermsRequest { video_subject, video_script, amount? }` |
| Response 200 | `VideoTermsResponse { data: { video_terms: string[] } }` |
| Dùng ở | `app/src/renderer/lib/store.ts:useGenerateTerms` |
| UI | Nút "Chỉ tạo từ khoá" trong Home; Tools → Terms |

### 2.16. Tạo metadata MXH

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/v1/social-metadata` |
| Request | `VideoSocialMetadataRequest { video_subject, video_script?, language?, platform? }` |
| Response 200 | `VideoSocialMetadataResponse { data: { title, caption, hashtags[] } }` |
| Dùng ở | `app/src/renderer/lib/store.ts:useGenerateSocialMetadata` |
| UI | Tools → Social Metadata |

---

## 3. Schema quan trọng

### 3.1. `VideoParams` (tham số tạo video)

```python
# Nguồn: api/MoneyPrinterTurbo/app/models/schema.py
class VideoParams(BaseModel):
    video_subject: str                           # BẮT BUỘC
    video_script: str = ""
    video_terms: Optional[str | list] = None
    video_aspect: VideoAspect = "9:16"           # 9:16 | 16:9 | 1:1
    video_concat_mode: VideoConcatMode = "random"  # random | sequential
    video_transition_mode: VideoTransitionMode | None = None  # None | Shuffle | FadeIn | FadeOut | SlideIn | SlideOut
    video_clip_duration: int = 5                 # 2..10
    video_count: int = 1                         # 1..5
    video_source: str = "pexels"                 # pexels | pixabay | coverr | local | douyin | bilibili | xiaohongshu
    video_materials: List[MaterialInfo] | None = None
    custom_audio_file: str | None = None
    video_language: str = ""                     # "" = auto detect
    voice_name: str = ""
    voice_volume: float = 1.0
    voice_rate: float = 1.0
    bgm_type: str = "random"                     # "" | "random" | "custom"
    bgm_file: str = ""
    bgm_volume: float = 0.2
    subtitle_enabled: bool = True
    subtitle_position: str = "bottom"            # top | center | bottom | custom
    custom_position: float = 70.0
    font_name: str = "STHeitiMedium.ttc"
    text_fore_color: str = "#FFFFFF"
    text_background_color: bool | str = True
    rounded_subtitle_background: bool = False
    font_size: int = 60
    stroke_color: str = "#000000"
    stroke_width: float = 1.5
    n_threads: int = 2
    paragraph_number: int = Field(1, ge=1, le=10)
    video_script_prompt: str = Field("", max_length=2000)
    custom_system_prompt: str = Field("", max_length=8000)
```

**Mapping trong Electron:**
- `app/src/renderer/lib/api-types.ts` — TypeScript interface `VideoParams`
- `app/src/renderer/pages/Home.tsx` — form đầy vào params

### 3.2. `TaskData`

```python
class TaskData:
    task_id: str
    state: int  # -1 FAILED | 1 COMPLETE | 4 PROCESSING
    progress: int  # 0..100
    videos: list[str]  # absolute URL khi trả về
    combined_videos: list[str]
    script: str | None
    terms: list[str] | None
    audio_file: str | None
    audio_duration: int | None
    subtitle_path: str | None
    materials: list[str] | None
    params: VideoParams | None
    cross_post_results: list | None
```

**Mapping**: `app/src/renderer/lib/api-types.ts:TaskData`

### 3.3. `BaseResponse<T>`

```python
class BaseResponse(BaseModel):
    status: int = 200
    message: str = "success"
    data: T
```

Tất cả response đều wrap trong envelope này. Client đã tự unwrap (`api.ts:request`).

### 3.4. `MaterialInfo`

```python
class MaterialInfo:
    provider: str = "pexels"  # pexels | pixabay | coverr | douyin | bilibili | xiaohongshu | local
    url: str
    duration: int = 0
```

---

## 4. Cấu hình MPT (`config.toml`)

| Section | Key | Type | Mặc định | Dùng ở |
|---------|-----|------|----------|--------|
| `app` | `llm_provider` | string | `"openai"` | Settings → LLM |
| `app` | `pexels_api_keys` | array | `[]` | Settings → Source |
| `app` | `pixabay_api_keys` | array | `[]` | Settings → Source |
| `app` | `coverr_api_keys` | array | `[]` | Settings → Source |
| `app` | `video_source` | string | `"pexels"` | Home (default) |
| `app` | `subtitle_provider` | string | `"edge"` | Settings → Subtitle |
| `app` | `video_codec` | string | `"libx264"` | Home → Advanced |
| `app` | `edge_tts_timeout` | int | `30` | runtime |
| `app` | `tls_verify` | bool | `true` | runtime |
| `app` | `imagemagick_path` | string | `""` | runtime |
| `app` | `ffmpeg_path` | string | `""` | runtime |
| `app` | `endpoint` | string | `""` | rewrite video URL |
| `app` | `material_directory` | string | `""` | runtime |
| `app` | `enable_redis` | bool | `false` | runtime |
| `app` | `redis_host/port/db/password` | string/int | localhost | runtime |
| `app` | `max_concurrent_tasks` | int | `5` | runtime |
| `app` | `max_queued_tasks` | int | `100` | runtime |
| `app` | `<provider>_api_key` | string | `""` | Settings → LLM |
| `app` | `<provider>_base_url` | string | `""` | Settings → LLM |
| `app` | `<provider>_model_name` | string | `""` | Settings → LLM |
| `whisper` | `model_size` | string | `"large-v3"` | Settings → Subtitle |
| `whisper` | `device` | string | `"CPU"` | Settings → Subtitle |
| `whisper` | `compute_type` | string | `"int8"` | Settings → Subtitle |
| `azure` | `speech_region/key` | string | `""` | Settings → TTS |
| `siliconflow` | `api_key` | string | `""` | Settings → TTS |
| `ui` | `hide_log` | bool | `false` | Settings → UI |
| `ui` | `hide_config` | bool | `false` | Settings → UI |
| `ui` | `language` | string | system locale | Settings → UI |
| `ui` | `subtitle_position/custom_position` | - | bottom/70 | Settings → Subtitle |
| `ui` | `font_name/text_fore_color/font_size/...` | - | - | Settings → Subtitle |
| `proxy` | `http/https` | string | `""` | runtime |
| top-level | `listen_host/listen_port` | string/int | `0.0.0.0/8080` | Settings → System |
| top-level | `project_version` | string | `"1.3.0"` | Contract check |

---

## 5. Hằng số & enum cần biết

### 5.1. Task state
```python
TASK_STATE_FAILED = -1
TASK_STATE_COMPLETE = 1
TASK_STATE_PROCESSING = 4
```
Map sang TS: `app/src/renderer/lib/api-types.ts:TASK_STATE_*`

### 5.2. Video aspect
- `9:16` portrait (TikTok/Reels) — 1080×1920
- `16:9` landscape (YouTube) — 1920×1080
- `1:1` square — 1080×1080

### 5.3. Video transition
- `None`, `Shuffle`, `FadeIn`, `FadeOut`, `SlideIn`, `SlideOut`

### 5.4. TTS server
- `NO_VOICE` (sentinel cho chế độ im lặng)
- `azure-tts-v1`, `azure-tts-v2`
- `siliconflow`
- `gemini-tts`
- `mimo-tts`

### 5.5. LLM provider (19)
```
openai, aihubmix, moonshot, azure, qwen, deepseek,
modelscope, gemini, grok, groq, ollama, g4f, oneapi,
cloudflare, ernie, minimax, mimo, pollinations, litellm
```

### 5.6. Script language (10 + auto)
```
"", "zh-CN", "zh-HK", "zh-TW", "de-DE", "en-US",
"fr-FR", "ru-RU", "vi-VN", "th-TH", "tr-TR"
```

### 5.7. File types
- Video: `mp4, mov, mkv, webm`
- Image: `jpg, jpeg, png, bmp`
- Material upload: `mp4, mov, avi, flv, mkv, jpg, jpeg, png`
- BGM: `mp3` only

---

## 6. Đường dẫn lưu trữ quan trọng

| Path (tương đối `api/MoneyPrinterTurbo/`) | Mục đích |
|------------------------------------------|----------|
| `config.toml` | Cấu hình chính |
| `resource/songs/*.mp3` | BGM mặc định |
| `resource/fonts/*.ttf|ttc` | Font phụ đề |
| `storage/tasks/<task_id>/script.json` | Kịch bản + params đã dùng |
| `storage/tasks/<task_id>/audio.mp3` | Audio TTS |
| `storage/tasks/<task_id>/subtitle.srt` | File phụ đề |
| `storage/tasks/<task_id>/combined-N.mp4` | Video ghép chưa có sub |
| `storage/tasks/<task_id>/final-N.mp4` | Video cuối |
| `storage/tasks/<task_id>/custom-audio.*` | Audio custom (nếu có) |
| `storage/local_videos/*` | Materials user upload |
| `storage/cache_videos/` | Stock video đã download (cache) |

---

## 7. Tích hợp với app/

### 7.1. File mapping

| File Electron | Vai trò |
|--------------|---------|
| `app/src/main/api-server.ts` | Spawn Python, health check, port-finder, auto-restart |
| `app/src/main/updater.ts` | Chạy `git pull` + `pip install` (giống `update.bat`) |
| `app/src/main/ipc-handlers.ts` | IPC: ping, restart, openPath, fs, updater |
| `app/src/main/contract.ts` | Contract version + check logic |
| `app/src/preload/index.ts` | contextBridge `window.minclip` |
| `app/src/preload/types.ts` | TypeScript types cho renderer |
| `app/src/renderer/lib/api.ts` | HTTP client + 16 endpoints |
| `app/src/renderer/lib/api-types.ts` | TypeScript interfaces |
| `app/src/renderer/lib/store.ts` | React Query hooks + Zustand |
| `app/src/renderer/pages/Home.tsx` | Form tạo video đầy đủ |
| `app/src/renderer/pages/Tasks.tsx` | List + modal |
| `app/src/renderer/pages/Library.tsx` | Gallery + player |
| `app/src/renderer/pages/Materials.tsx` | Upload/list materials |
| `app/src/renderer/pages/BGM.tsx` | Upload/list BGM |
| `app/src/renderer/pages/Tools.tsx` | Script/Terms/Metadata |
| `app/src/renderer/pages/Settings.tsx` | Cấu hình |
| `app/src/renderer/components/TopBar.tsx` | Status bar + window controls |

### 7.2. Env vars khi spawn Python (giống `api.bat`)

```ts
env: {
  ...process.env,
  FFMPEG_BINARY: "<api>/lib/ffmpeg/ffmpeg-7.0-essentials_build/ffmpeg.exe",
  IMAGEMAGICK_BINARY: "<api>/lib/imagemagic/ImageMagick-7.1.1-29-portable-Q16-x64/magick.exe",
  MPT_WEBUI_HOST: "127.0.0.1",
  MPT_WEBUI_PORT: "<port>",
}
```

---

## 8. Lệnh build/verify

```bash
cd app
npm install
npm run typecheck    # 0 errors
npm run build        # build tất cả
npm run dev          # dev mode
npm run dist         # build .exe installer
```

---

## 9. Auto-detect khi upstream MPT thay đổi

App có 2 cơ chế tự phát hiện khi MPT được cập nhật mà chưa cập nhật tương ứng:

### 9.1. Startup version check
- Đọc `project_version` từ `config.toml` của MPT (qua API: chưa có endpoint,
  nên đọc trực tiếp file `api/MoneyPrinterTurbo/config.toml`)
- So sánh với `MIN_MPT_VERSION` trong `app/src/main/contract.ts`
- Nếu MPT version < MIN_MPT_VERSION → cảnh báo trong splash + Settings

### 9.2. OpenAPI contract diff
- Trong Settings → System có nút "So sánh hợp đồng"
- Bấm → app gọi `GET /openapi.json` từ API đang chạy
- So sánh paths/methods với `EXPECTED_PATHS` trong `contract.ts`
- Hiển thị: endpoint nào MPT mất, endpoint nào app dùng mà MPT không có,
  endpoint nào mới MPT có mà app chưa biết

---

## 10. Phiên bản hợp đồng

| Contract version | MPT min version | Ngày | Ghi chú |
|------------------|-----------------|------|---------|
| `1.0.0` | `1.3.0` | 2026-06-19 | Khởi tạo, đầy đủ 16 endpoint + VideoParams + enum |

Cập nhật số phiên bản trong `app/src/main/contract.ts` khi:
- Thêm/xoá endpoint → bump `MINOR`
- Thay đổi schema VideoParams/TaskData (breaking) → bump `MAJOR` + cập nhật `docs/MIGRATION.md`
- Sửa docs/mapping → bump `PATCH`
