import { EventEmitter } from "node:events";
import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import net from "node:net";
import path from "node:path";
import type { AppStatusPayload, ApiLogPayload } from "../shared/ipc-channels";
import { ensureConfigExists, readListenPort, patchConfig } from "./config-toml";

export interface ApiServerOptions {
  pythonBinary: string;
  entryScript: string;
  mptDir: string;
  configToml: string;
  ffmpegBinary: string;
  imagemagickBinary: string;
  materialsDir: string;
  isDev: boolean;
  preferredHost?: string;
  portRange?: [number, number];
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_RANGE: [number, number] = [8080, 8099];

export class ApiServer extends EventEmitter {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private _baseUrl: string | null = null;
  private restartAttempts = 0;
  private maxRestartAttempts = 3;
  private options: Required<ApiServerOptions>;

  constructor(opts: ApiServerOptions) {
    super();
    this.options = {
      preferredHost: DEFAULT_HOST,
      portRange: DEFAULT_RANGE,
      ...opts,
    } as Required<ApiServerOptions>;
  }

  get baseUrl(): string | null {
    return this._baseUrl;
  }

  private status(payload: AppStatusPayload): void {
    this.emit("status", payload);
  }

  private log(payload: ApiLogPayload): void {
    this.emit("log", payload);
  }

  /** Tìm cổng trống: thử kết nối, nếu kết nối được nghĩa là đang bị chiếm. */
  private async findFreePort(host: string, preferred: number, range: [number, number]): Promise<number> {
    const isFree = (port: number): Promise<boolean> =>
      new Promise((resolve) => {
        const socket = new net.Socket();
        let settled = false;
        const done = (free: boolean) => {
          if (settled) return;
          settled = true;
          socket.destroy();
          resolve(free);
        };
        socket.setTimeout(400);
        socket.once("timeout", () => done(true)); // không kết nối được → trống
        socket.once("error", () => done(true)); // ECONNREFUSED → trống
        socket.once("connect", () => done(false)); // kết nối được → bị chiếm
        socket.connect(port, host);
      });

    const ports: number[] = [preferred];
    for (let p = range[0]; p <= range[1]; p++) if (p !== preferred) ports.push(p);
    for (const port of ports) {
      // eslint-disable-next-line no-await-in-loop
      if (await isFree(port)) return port;
    }
    throw new Error(`Không còn cổng trống trong khoảng ${range[0]}-${range[1]}`);
  }

  async start(): Promise<string> {
    const { preferredHost, portRange, configToml, mptDir } = this.options;

    // Đảm bảo config.toml tồn tại (copy từ config.example.toml nếu thiếu).
    const examplePath = path.join(mptDir, "config.example.toml");
    await ensureConfigExists(configToml, examplePath);

    const configPort = await readListenPort(configToml);
    this.status({ status: "waiting-ping", message: "Đang chuẩn bị..." });
    const port = await this.findFreePort(preferredHost, configPort, portRange);
    const baseUrl = `http://${preferredHost}:${port}`;
    this._baseUrl = baseUrl;

    // Ghi cấu hình runtime vào config.toml: host/port + đường dẫn binary + material_directory.
    // (MPT main.py đọc listen_port từ config.toml, KHÔNG đọc env var.)
    await patchConfig(configToml, {
      host: preferredHost,
      port,
      ffmpegPath: this.options.ffmpegBinary,
      imagemagickPath: this.options.imagemagickBinary,
      materialDirectory: this.options.materialsDir,
    });

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      FFMPEG_BINARY: this.options.ffmpegBinary,
      IMAGEMAGICK_BINARY: this.options.imagemagickBinary,
    };

    this.status({ status: "spawning-python", message: "Đang chuẩn bị...", progress: 30 });

    this.proc = spawn(this.options.pythonBinary, [this.options.entryScript], {
      cwd: mptDir,
      env,
      windowsHide: true,
    });

    this.proc.stdout.setEncoding("utf-8");
    this.proc.stderr.setEncoding("utf-8");
    this.proc.stdout.on("data", (chunk: string) => {
      for (const line of chunk.split(/\r?\n/).filter(Boolean)) {
        this.log({ level: "info", message: line, timestamp: Date.now() });
      }
    });
    this.proc.stderr.on("data", (chunk: string) => {
      for (const line of chunk.split(/\r?\n/).filter(Boolean)) {
        this.log({ level: "warn", message: line, timestamp: Date.now() });
      }
    });

    this.proc.on("exit", (code, signal) => {
      this.log({ level: "warn", message: `Python API exited code=${code} signal=${signal}`, timestamp: Date.now() });
      this.proc = null;
      if (code !== 0 && this.restartAttempts < this.maxRestartAttempts) {
        this.restartAttempts++;
        this.status({
          status: "spawning-python",
          message: `Đang khởi động lại... (${this.restartAttempts}/${this.maxRestartAttempts})`,
        });
        setTimeout(() => {
          this.start().catch((err) => this.status({ status: "error", message: `Restart failed: ${String(err)}` }));
        }, 2000);
      }
    });

    await this.waitForHealth(baseUrl, 180_000);
    this.restartAttempts = 0;
    return baseUrl;
  }

  /** Chờ API sẵn sàng bằng GET /docs (FastAPI Swagger UI luôn 200 khi server lên). */
  private async waitForHealth(baseUrl: string, timeoutMs: number): Promise<void> {
    const start = Date.now();
    let attempt = 0;
    while (Date.now() - start < timeoutMs) {
      attempt++;
      this.status({
        status: "waiting-ping",
        message: `Sắp sẵn sàng… (${Math.round((Date.now() - start) / 1000)}s)`,
        progress: 30 + Math.min(60, attempt * 2),
      });
      try {
        const res = await fetch(`${baseUrl}/docs`, { signal: AbortSignal.timeout(3000) });
        if (res.ok || res.status === 200) return;
      } catch {
        // chưa sẵn sàng
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error(
      `Khởi động không thành công sau ${Math.round(timeoutMs / 1000)} giây. ` +
        `Vui lòng thử lại; nếu vẫn lỗi, xem "Chi tiết kỹ thuật" để biết thêm.`,
    );
  }

  async restart(): Promise<string> {
    this.stop();
    return this.start();
  }

  stop(): void {
    if (this.proc) {
      try {
        this.proc.kill();
      } catch {
        // ignore
      }
      this.proc = null;
    }
  }
}
