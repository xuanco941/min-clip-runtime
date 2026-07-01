// Tải file lớn (payload ~2GB) từ GitHub Releases.
// Hỗ trợ: HTTP Range resume từ file .part, theo dõi tiến độ + tốc độ, verify SHA256.

import fs from "node:fs";
import fsp from "node:fs/promises";
import nodePath from "node:path";
import crypto from "node:crypto";
import https from "node:https";
import http from "node:http";
import { URL } from "node:url";

export interface DownloadProgress {
  received: number;
  total: number | null;
  bytesPerSec: number;
  percent: number | null;
}

export interface DownloadOptions {
  url: string;
  destPath: string; // đường dẫn file đích cuối cùng
  expectedSha256?: string | null;
  onProgress?: (p: DownloadProgress) => void;
  signal?: AbortSignal;
}

const MAX_REDIRECTS = 6;

// Cast về `typeof http` để tránh lỗi "union not callable" khi gọi .get trên
// (typeof https | typeof http). Runtime của https.get tương thích http.get.
function getClient(u: string): typeof http {
  return (u.startsWith("https:") ? https : http) as unknown as typeof http;
}

interface OpenResult {
  res: http.IncomingMessage;
  statusCode: number;
  total: number | null;
  acceptRanges: boolean;
}

/** Mở request GET (theo redirect), kèm Range nếu resume. */
function openRequest(url: string, rangeStart: number, signal?: AbortSignal): Promise<OpenResult> {
  return new Promise((resolve, reject) => {
    let redirects = 0;

    const doRequest = (target: string) => {
      const u = new URL(target);
      const headers: Record<string, string> = {
        "User-Agent": "min-clip-downloader",
        Accept: "application/octet-stream",
      };
      if (rangeStart > 0) headers.Range = `bytes=${rangeStart}-`;

      const req = getClient(target).get(
        { protocol: u.protocol, hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers },
        (res) => {
          const code = res.statusCode ?? 0;
          if (code >= 300 && code < 400 && res.headers.location) {
            res.resume(); // bỏ body redirect
            if (redirects++ >= MAX_REDIRECTS) {
              reject(new Error("Quá nhiều redirect khi tải"));
              return;
            }
            const next = new URL(res.headers.location, target).toString();
            doRequest(next);
            return;
          }
          if (code !== 200 && code !== 206) {
            res.resume();
            reject(new Error(`Tải thất bại: HTTP ${code} (${target})`));
            return;
          }
          const lenHeader = res.headers["content-length"];
          let total: number | null = lenHeader ? parseInt(lenHeader, 10) : null;
          // Với 206 Partial, content-length là phần còn lại → cộng offset.
          if (code === 206 && total !== null) total += rangeStart;
          const acceptRanges = code === 206 || res.headers["accept-ranges"] === "bytes";
          resolve({ res, statusCode: code, total, acceptRanges });
        },
      );
      req.on("error", reject);
      if (signal) {
        signal.addEventListener("abort", () => req.destroy(new Error("Đã huỷ tải")), { once: true });
      }
    };

    doRequest(url);
  });
}

async function sha256OfFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (d) => hash.update(d));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

/**
 * Tải `url` về `destPath`. Tự resume từ `<destPath>.part` nếu có.
 * Verify SHA256 nếu cung cấp. Trả về đường dẫn file đã tải.
 */
export async function downloadFile(opts: DownloadOptions): Promise<string> {
  const { url, destPath, expectedSha256, onProgress, signal } = opts;
  const partPath = `${destPath}.part`;

  await fsp.mkdir(nodePath.dirname(destPath), { recursive: true });

  // Nếu đã có file đích hợp lệ → bỏ qua tải.
  if (expectedSha256) {
    try {
      await fsp.access(destPath);
      const sum = await sha256OfFile(destPath);
      if (sum.toLowerCase() === expectedSha256.toLowerCase()) return destPath;
    } catch {
      // tải lại
    }
  }

  let resumeFrom = 0;
  try {
    const st = await fsp.stat(partPath);
    resumeFrom = st.size;
  } catch {
    resumeFrom = 0;
  }

  const { res, statusCode, total } = await openRequest(url, resumeFrom, signal);

  // Server không hỗ trợ Range → bắt đầu lại từ đầu.
  const append = statusCode === 206 && resumeFrom > 0;
  if (!append) resumeFrom = 0;

  const out = fs.createWriteStream(partPath, { flags: append ? "a" : "w" });

  let received = resumeFrom;
  let lastTick = Date.now();
  let lastBytes = received;
  let bytesPerSec = 0;

  await new Promise<void>((resolve, reject) => {
    res.on("data", (chunk: Buffer) => {
      received += chunk.length;
      const now = Date.now();
      if (now - lastTick >= 500) {
        bytesPerSec = ((received - lastBytes) * 1000) / (now - lastTick);
        lastTick = now;
        lastBytes = received;
        onProgress?.({
          received,
          total,
          bytesPerSec,
          percent: total ? Math.min(100, (received / total) * 100) : null,
        });
      }
    });
    res.pipe(out);
    out.on("finish", () => resolve());
    out.on("error", reject);
    res.on("error", reject);
  });

  onProgress?.({ received, total, bytesPerSec, percent: total ? 100 : null });

  // Verify checksum nếu có.
  if (expectedSha256) {
    const sum = await sha256OfFile(partPath);
    if (sum.toLowerCase() !== expectedSha256.toLowerCase()) {
      await fsp.rm(partPath, { force: true });
      throw new Error("Dữ liệu tải về bị lỗi (không toàn vẹn). Vui lòng thử lại.");
    }
  }

  await fsp.rm(destPath, { force: true });
  await fsp.rename(partPath, destPath);
  return destPath;
}

/** Tải file text nhỏ (vd file .sha256) và trả về nội dung. */
export async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const { res } = await openRequest(url, 0, signal);
  return new Promise((resolve, reject) => {
    let data = "";
    res.setEncoding("utf-8");
    res.on("data", (d) => (data += d));
    res.on("end", () => resolve(data));
    res.on("error", reject);
  });
}

/** Phân tích hex sha256 từ nội dung file `.sha256` (định dạng "<hex>  <name>"). */
export function parseSha256(text: string): string | null {
  const m = text.trim().match(/[a-fA-F0-9]{64}/);
  return m ? m[0].toLowerCase() : null;
}
