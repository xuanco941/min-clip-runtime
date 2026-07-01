// Custom protocol `minclip-media://` để renderer phát file media local
// (nhạc nền, video material...) mà không cần API HTTP.
//
// Dùng: <audio src="minclip-media://songs/ten-bai.mp3" />
//        <video src="minclip-media://local/clip.mp4" />
//
// host = loại media (songs | local | storage), pathname = tên file (đã encode).

import { protocol, net } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { resolveAppPaths } from "./paths";

const SCHEME = "minclip-media";

const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

/** Gọi TRƯỚC app.whenReady() — đăng ký scheme là privileged (stream + fetch). */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, bypassCSP: true },
    },
  ]);
}

/** Gọi SAU app.whenReady() — gắn handler trả file. */
export function handleMediaProtocol(): void {
  const paths = resolveAppPaths();
  // Dùng đường dẫn theo mptDir để đúng cả dev (thư mục thật) lẫn prod (junction → userdata).
  const roots: Record<string, string> = {
    songs: path.join(paths.mptDir, "resource", "songs"),
    local: path.join(paths.mptDir, "storage", "local_videos"),
    storage: path.join(paths.mptDir, "storage"),
  };

  protocol.handle(SCHEME, async (request) => {
    try {
      const url = new URL(request.url);
      const root = roots[url.hostname];
      if (!root) return new Response("unknown media root", { status: 404 });

      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      const filePath = path.resolve(root, rel);
      // Chặn path traversal: file phải nằm trong root.
      if (filePath !== path.resolve(root) && !filePath.startsWith(path.resolve(root) + path.sep)) {
        return new Response("forbidden", { status: 403 });
      }

      const res = await net.fetch(pathToFileURL(filePath).href, { headers: request.headers });
      const type = MIME[path.extname(filePath).toLowerCase()];
      if (!type) return res;
      // Gắn lại Content-Type cho đúng để <audio>/<video> phát được.
      const headers = new Headers(res.headers);
      headers.set("Content-Type", type);
      return new Response(res.body, { status: res.status, headers });
    } catch (err) {
      return new Response(`media error: ${String(err)}`, { status: 500 });
    }
  });
}
