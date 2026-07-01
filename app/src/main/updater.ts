import { spawn } from "node:child_process";
import path from "node:path";
import { EventEmitter } from "node:events";
import type { UpdaterResultPayload } from "../shared/ipc-channels";

export interface UpdaterOptions {
  apiBaseDir: string;
}

export class Updater extends EventEmitter {
  private options: UpdaterOptions;

  constructor(opts: UpdaterOptions) {
    super();
    this.options = opts;
  }

  private gitBinary(): string {
    return path.join(this.options.apiBaseDir, "lib", "git", "bin", "git.exe");
  }

  private pipBinary(): string {
    return path.join(this.options.apiBaseDir, "lib", "python", "Scripts", "pip.exe");
  }

  private run(cmd: string, args: string[], cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, { cwd, windowsHide: true });
      let out = "";
      let err = "";
      proc.stdout.setEncoding("utf-8");
      proc.stderr.setEncoding("utf-8");
      proc.stdout.on("data", (d: string) => {
        out += d;
      });
      proc.stderr.on("data", (d: string) => {
        err += d;
      });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) resolve(out);
        else reject(new Error(`${cmd} exited with ${code}\n${err}`));
      });
    });
  }

  async check(): Promise<{ hasUpdate: boolean; log: string[] }> {
    const log: string[] = [];
    const mptDir = path.join(this.options.apiBaseDir, "MoneyPrinterTurbo");
    try {
      const out = await this.run(this.gitBinary(), ["-C", mptDir, "fetch"], this.options.apiBaseDir);
      log.push(out.trim());
      const diff = await this.run(this.gitBinary(), ["-C", mptDir, "status", "-uno"], this.options.apiBaseDir);
      const hasUpdate = /behind\s+\d+/i.test(diff);
      log.push(diff.trim());
      return { hasUpdate, log };
    } catch (err) {
      log.push(`Check failed: ${String(err)}`);
      return { hasUpdate: false, log };
    }
  }

  async run_full(): Promise<UpdaterResultPayload> {
    const log: string[] = [];
    const mptDir = path.join(this.options.apiBaseDir, "MoneyPrinterTurbo");
    try {
      const pullOut = await this.run(this.gitBinary(), ["-C", mptDir, "pull"], this.options.apiBaseDir);
      log.push("git pull:", pullOut.trim());
      const changed = !pullOut.includes("Already up to date");
      if (changed) {
        const requirements = path.join(mptDir, "requirements.txt");
        const pipOut = await this.run(
          this.pipBinary(),
          ["install", "-r", requirements],
          mptDir,
        );
        log.push("pip install:", pipOut.trim());
      }
      return { success: true, message: "Cập nhật hoàn tất", changed, log };
    } catch (err) {
      return {
        success: false,
        message: String(err),
        changed: false,
        log,
      };
    }
  }
}