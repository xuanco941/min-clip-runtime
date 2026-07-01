# Migration Guide — Cập nhật khi MoneyPrinterTurbo upstream thay đổi

> File này là "checklist thực thi" khi `api/update.bat` pull code mới. Đọc song
> song với `docs/API_CONTRACT.md` để biết field/endpoint nào đang được dùng.

## Quy trình chuẩn

```powershell
# 1. Cập nhật MPT
cd C:\Users\xuanc\Desktop\personal\min-clip\api
update.bat

# 2. Xem log thay đổi
cd MoneyPrinterTurbo
..\lib\git\bin\git.exe log --oneline -20

# 3. So sánh với API_CONTRACT.md
# - Endpoint mới/sửa/xoá?
# - Field mới/sửa/xoá trong VideoParams, TaskData?
# - Enum mới?
# - Config key mới?
# → Cập nhật tương ứng trong app/

# 4. Verify
cd C:\Users\xuanc\Desktop\personal\min-clip\app
npm run typecheck
npm run build
```

## Checklist khi xuất hiện thay đổi

### A. Endpoint mới
- [ ] Thêm method + path vào `app/src/renderer/lib/api.ts`
- [ ] Thêm TypeScript response type vào `app/src/renderer/lib/api-types.ts`
- [ ] Thêm React Query hook vào `app/src/renderer/lib/store.ts` (nếu cần)
- [ ] Thêm UI control trong `app/src/renderer/pages/*`
- [ ] Thêm path vào `EXPECTED_PATHS` trong `app/src/main/contract.ts`
- [ ] Thêm hàng vào bảng "2. Endpoint" trong `docs/API_CONTRACT.md`
- [ ] Bump contract version (MINOR)

### B. Endpoint bị xoá
- [ ] Tìm và xoá tất cả chỗ gọi endpoint đó trong `app/src/renderer/`
- [ ] Xoá path trong `EXPECTED_PATHS`
- [ ] Xoá hàng trong bảng "2. Endpoint" của contract doc
- [ ] Bump contract version (MINOR)

### C. Field mới trong VideoParams
- [ ] Thêm field vào `VideoParams` interface trong `app/src/renderer/lib/api-types.ts`
- [ ] Thêm control vào `app/src/renderer/pages/Home.tsx` (hoặc Settings nếu là config)
- [ ] Nếu là config key, thêm vào Settings
- [ ] Cập nhật DEFAULT_PARAMS trong Home.tsx
- [ ] Bump contract version (MINOR)

### D. Field bị xoá khỏi VideoParams
- [ ] Xoá field khỏi interface
- [ ] Xoá control trong Home/Settings
- [ ] Cập nhật DEFAULT_PARAMS
- [ ] Bump contract version (MAJOR) — đây là breaking change

### E. Field bị đổi kiểu
- [ ] Cập nhật type trong interface
- [ ] Sửa code gọi
- [ ] Bump contract version (MAJOR) — breaking

### F. Enum mới (LLM provider, TTS, transition, v.v.)
- [ ] Thêm value vào union type
- [ ] Thêm option vào Select trong UI
- [ ] Cập nhật enum mapping trong Home/Settings
- [ ] Bump contract version (MINOR)

### G. Config key mới trong config.toml
- [ ] Thêm field vào Settings form tương ứng
- [ ] Bump contract version (PATCH — không breaking)

### H. Task state mới
- [ ] Thêm constant trong `api-types.ts`
- [ ] Cập nhận `stateInfo()` trong Tasks.tsx
- [ ] Bump contract version (MINOR)

### I. Thay đổi đường dẫn lưu trữ
- [ ] Cập nhật bảng "6. Đường dẫn" trong contract doc
- [ ] Cập nhật logic open folder nếu có
- [ ] Bump contract version (PATCH)

## Ví dụ thực tế

### Tình huống 1: MPT thêm endpoint mới `POST /api/v1/jobs/cancel`

```ts
// app/src/renderer/lib/api.ts
+ cancelJob: (base: string, id: string) =>
+   request<unknown>(base, `/api/v1/jobs/cancel/${id}`, { method: "POST" }),
```

```ts
// app/src/main/contract.ts
+ "POST /api/v1/jobs/cancel/{id}",
```

```md
<!-- docs/API_CONTRACT.md - thêm hàng vào bảng 2 -->

| 2.17. Huỷ tác vụ | ... |
```

```ts
// app/src/main/contract.ts
- export const MIN_MPT_VERSION = "1.3.0";
+ export const MIN_MPT_VERSION = "1.3.0";
+ export const CONTRACT_VERSION = "1.1.0"; // bump MINOR
```

### Tình huống 2: MPT bổ sung field `voice_pitch` vào VideoParams

```ts
// app/src/renderer/lib/api-types.ts
export interface VideoParams {
  ...
+ voice_pitch?: number;
}
```

```tsx
// app/src/renderer/pages/Home.tsx - thêm slider trong AudioSection
<Field label={`Cao độ giọng: ${params.voice_pitch}x`}>
  <input type="range" min={0.5} max={2} step={0.1}
    value={params.voice_pitch}
    onChange={...} />
</Field>
```

## Sau khi cập nhật xong

1. Chạy `npm run typecheck` — phải 0 errors
2. Chạy `npm run build` — phải pass
3. Test thủ công: chạy `npm run dev` và thử tính năng mới
4. Nếu build .exe: `npm run dist`
5. **KHÔNG tự commit** — để người dùng review trước
