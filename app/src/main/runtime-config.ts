// Cấu hình runtime payload (phần nặng ~2GB tải từ GitHub Releases).
//
// Payload KHÔNG được đóng gói vào installer. Lần chạy đầu, app tải
// `min-clip-runtime-<version>.zip` (+ file `.sha256`) từ GitHub Releases,
// verify checksum rồi giải nén vào %LOCALAPPDATA%\min-clip\runtime.
//
// Có thể override khi dev/test bằng env vars:
//   MINCLIP_RUNTIME_URL     — URL trực tiếp tới zip (bỏ qua GitHub API)
//   MINCLIP_RUNTIME_SHA256  — sha256 mong đợi (hex) cho URL trên
//   MINCLIP_API_DIR         — trỏ thẳng tới thư mục api/ có sẵn (bỏ qua tải)

// Phiên bản payload — gắn với project_version của MoneyPrinterTurbo.
export const RUNTIME_VERSION = "1.0.7";

// Toạ độ GitHub Releases nơi chứa payload. ĐỔI thành repo thật của bạn.
export const RUNTIME_REPO_OWNER = "xuanco941";
export const RUNTIME_REPO_NAME = "min-clip-runtime";

// Tag của release chứa payload và tên asset.
// Dùng chung 1 release với app (electron-builder publish tạo tag `v<version>`).
export const RUNTIME_RELEASE_TAG = `v${RUNTIME_VERSION}`;
export const RUNTIME_ASSET_NAME = `min-clip-runtime-${RUNTIME_VERSION}.zip`;
export const RUNTIME_SHA256_ASSET_NAME = `${RUNTIME_ASSET_NAME}.sha256`;

export interface RuntimeSource {
  zipUrl: string;
  sha256Url: string | null;
  sha256: string | null;
}

/**
 * Quyết định nguồn tải payload: ưu tiên env override (test), nếu không thì
 * dựng URL tải trực tiếp từ GitHub Releases theo tag.
 */
export function resolveRuntimeSource(): RuntimeSource {
  const envUrl = process.env.MINCLIP_RUNTIME_URL;
  if (envUrl) {
    return {
      zipUrl: envUrl,
      sha256Url: null,
      sha256: process.env.MINCLIP_RUNTIME_SHA256 ?? null,
    };
  }
  const base = `https://github.com/${RUNTIME_REPO_OWNER}/${RUNTIME_REPO_NAME}/releases/download/${RUNTIME_RELEASE_TAG}`;
  return {
    zipUrl: `${base}/${RUNTIME_ASSET_NAME}`,
    sha256Url: `${base}/${RUNTIME_SHA256_ASSET_NAME}`,
    sha256: null,
  };
}
