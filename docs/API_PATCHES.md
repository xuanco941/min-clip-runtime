# Các tùy chỉnh trong `api/MoneyPrinterTurbo` (để re-apply sau khi cập nhật)

`api/MoneyPrinterTurbo` là source gốc của bên thứ ba, được cập nhật bằng `git pull`
(Settings cũ / `update.bat`). min-clip có **thêm vài tính năng** vào source này.
Khi bản gốc ra phiên bản mới (code khác đi), `git pull` có thể **ghi đè / xung đột**
với các sửa đổi của ta. **File này liệt kê chính xác mọi thay đổi để khôi phục lại.**

> Quy tắc git: `git pull` **giữ nguyên file MỚI chưa track** (untracked) nhưng có thể
> **xung đột ở file đã sửa**. → Ta cố tình để **hầu hết code trong FILE MỚI**, chỉ
> sửa **tối thiểu** ở file gốc.

---

## Cách kiểm tra sau khi cập nhật MPT

```powershell
cd api\MoneyPrinterTurbo
git status        # xem file nào của ta còn / bị đổi
git pull          # nếu báo xung đột ở voice.py → mở ra áp lại đoạn [min-clip] bên dưới
```

Sau khi pull xong, kiểm tra checklist ở cuối file này.

---

## PATCH 1 — Giọng đọc tiếng Việt LOCAL (valtec-tts)

**Mục đích:** thêm nhiều giọng tiếng Việt miễn phí, chạy local, **vẫn giữ phụ đề**
(trả về `SubMaker` nên pipeline canh giờ + phụ đề hoạt động như giọng có sẵn).

**Engine:** [valtec-tts](https://github.com/tronghieuit/valtec-tts) — 74.8M tham số,
chạy CPU, 5 giọng dựng sẵn (NF/SF/NM1/SM/NM2) + zero-shot clone. **License CC BY-NC 4.0
(chỉ phi thương mại).**

### 1a. FILE MỚI (untracked — `git pull` KHÔNG xoá, không cần làm gì khi update)

```
api/MoneyPrinterTurbo/app/services/valtec_local.py
```

Toàn bộ logic gọi valtec-tts nằm ở đây (parse voice `valtec:...`, dựng giọng/clone,
chuyển wav→mp3, tạo `SubMaker`). **Nếu file này mất** sau khi cập nhật, copy lại từ
bản backup của min-clip (nó nằm trong repo min-clip, không nằm trong MPT gốc).

### 1b. SỬA FILE GỐC: `app/services/voice.py` (CẦN áp lại nếu pull ghi đè)

Trong hàm **`def tts(...)`**, ngay **trước** dòng cuối `return azure_tts_v1(...)`,
thêm nhánh `elif`:

```python
    # [min-clip] giọng tiếng Việt local (valtec-tts) — xem docs/API_PATCHES.md
    elif isinstance(voice_name, str) and voice_name.startswith("valtec:"):
        from app.services import valtec_local

        return valtec_local.valtec_tts(
            text, voice_name, voice_rate, voice_file, voice_volume
        )
    return azure_tts_v1(text, voice_name, voice_rate, voice_file)
```

> Đây là thay đổi DUY NHẤT trên file gốc cho patch này (≈ 6 dòng). `valtec_local.py`
> import `SubMaker`, `ensure_legacy_submaker_fields`, `populate_legacy_submaker_with_full_text`
> từ `app.services.voice` — nếu bản mới đổi tên các hàm này, sửa lại import tương ứng
> trong `valtec_local.py`.

### 1c. Cài engine vào runtime (1 lần / khi tải lại runtime)

valtec-tts cần PyTorch. Cài bằng python của runtime:

```powershell
# Dev:
api\lib\python\python.exe -m pip install git+https://github.com/tronghieuit/valtec-tts.git
# App đã cài: %LOCALAPPDATA%\min-clip\runtime\lib\python\python.exe -m pip install ...
```

min-clip có nút **"Cài đặt giọng Việt local"** (Settings/Tạo video) tự chạy lệnh này.
Model giọng tự tải từ HuggingFace lần đầu về `%LOCALAPPDATA%\valtec_tts\models\`.

### 1d. Định dạng `voice_name` mà min-clip gửi

- Giọng dựng sẵn: `valtec:NF-Female`, `valtec:SF-Female`, `valtec:NM1-Male`,
  `valtec:SM-Male`, `valtec:NM2-Male`.
- Clone: `valtec:clone-Custom` + đặt `config.app["valtec_reference_audio"]` =
  đường dẫn file giọng mẫu (.wav ~5–10s).

Danh sách giọng phía UI nằm ở `app/src/renderer/lib/voices.ts` (min-clip), không cần sửa MPT.

---

## PATCH 2 — Nhà cung cấp LLM "OpenRouter"

**Mục đích:** thêm OpenRouter (cổng tương thích OpenAI, có nhiều model FREE) thành
một lựa chọn provider riêng trong app, thay vì phải mượn provider `openai`.

### SỬA FILE GỐC: `app/services/llm.py` (CẦN áp lại nếu pull ghi đè)

Trong hàm `_generate_response(...)` (chuỗi `if/elif llm_provider == ...`), **ngay sau**
nhánh `elif llm_provider == "litellm":` và **trước** dòng
`if llm_provider not in ["pollinations", "ollama", "litellm"]:`, thêm:

```python
            elif llm_provider == "openrouter":
                # [min-clip] OpenRouter — cổng tương thích OpenAI. Xem docs/API_PATCHES.md
                api_key = config.app.get("openrouter_api_key")
                model_name = config.app.get("openrouter_model_name")
                base_url = config.app.get("openrouter_base_url", "") or "https://openrouter.ai/api/v1"
```

> Vì `openrouter` không nằm trong các nhánh xử lý đặc biệt (qwen/gemini/azure/cloudflare/
> ernie/litellm), nó tự dùng **client OpenAI chung** ở cuối hàm → hoạt động ngay.
> Config keys phía app: `[app].openrouter_api_key / openrouter_base_url / openrouter_model_name`
> + `llm_provider = "openrouter"`. Danh sách provider/model phía UI ở
> `app/src/renderer/pages/Settings.tsx` + `lib/models.ts` (không cần sửa MPT).

---

## Checklist sau mỗi lần cập nhật MPT

- [ ] `app/services/valtec_local.py` còn tồn tại (nếu mất → copy lại).
- [ ] `app/services/voice.py` còn nhánh `elif ... "valtec:"` trong `tts()` (nếu mất → dán lại đoạn 1b).
- [ ] `app/services/llm.py` còn nhánh `elif llm_provider == "openrouter":` (nếu mất → dán lại PATCH 2).
- [ ] `valtec_local.py` import được `SubMaker` / `ensure_legacy_submaker_fields` /
      `populate_legacy_submaker_with_full_text` từ `app.services.voice` (nếu bản mới đổi tên → sửa import).
- [ ] Chạy thử "Nghe thử" 1 giọng `valtec:NF-Female` → ra tiếng + có phụ đề khi tạo video.

---

## Ghi chú cho các patch về sau

Mỗi khi thêm tính năng mới vào `api/`, **ghi thêm một mục PATCH** ở đây theo mẫu:
- Mục đích
- File MỚI (nếu có)
- Đoạn sửa trên file gốc (dán nguyên văn để copy lại)
- Cách kiểm tra
