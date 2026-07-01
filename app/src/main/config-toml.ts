// Chỉnh sửa config.toml theo dòng (không phụ thuộc thư viện TOML).
//
// config.py của MoneyPrinterTurbo đọc:
//   - listen_host / listen_port  : KEY TOP-LEVEL (không nằm trong [app])
//   - ffmpeg_path / imagemagick_path / material_directory : trong [app]
// (xem app/config/config.py:175-176, 191-197)

import fs from "node:fs/promises";

function tomlString(value: string): string {
  // TOML basic string: escape backslash và dấu nháy kép.
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function firstSectionIndex(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i])) return i;
  }
  return lines.length;
}

/** Đặt một key top-level (trước [section] đầu tiên). Thay nếu có, chèn nếu chưa. */
function setTopLevelKey(lines: string[], key: string, rendered: string): string[] {
  const limit = firstSectionIndex(lines);
  const re = new RegExp(`^\\s*${key}\\s*=`);
  for (let i = 0; i < limit; i++) {
    if (re.test(lines[i])) {
      lines[i] = `${key} = ${rendered}`;
      return lines;
    }
  }
  // Chèn ngay đầu file để chắc chắn nằm ở top-level.
  lines.splice(0, 0, `${key} = ${rendered}`);
  return lines;
}

/** Đặt một key trong [section]. Thay nếu có, chèn ngay dưới header nếu chưa. */
function setSectionKey(lines: string[], section: string, key: string, rendered: string): string[] {
  const headerRe = new RegExp(`^\\s*\\[${section}\\]\\s*$`);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headerRe.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start === -1) {
    // Không có section → thêm vào cuối file.
    lines.push("", `[${section}]`, `${key} = ${rendered}`);
    return lines;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const re = new RegExp(`^\\s*${key}\\s*=`);
  for (let i = start + 1; i < end; i++) {
    if (re.test(lines[i])) {
      lines[i] = `${key} = ${rendered}`;
      return lines;
    }
  }
  lines.splice(start + 1, 0, `${key} = ${rendered}`);
  return lines;
}

export type TomlScalar = string | number | boolean;
export type TomlValue = TomlScalar | string[];

function renderValue(value: TomlValue): string {
  if (Array.isArray(value)) return `[${value.map((v) => tomlString(v)).join(", ")}]`;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return tomlString(value);
}

function parseValue(raw: string): TomlValue {
  const s = raw.trim();
  if (s.startsWith("[")) {
    // Mảng 1 dòng các chuỗi: ["a", "b"]
    const inner = s.replace(/^\[/, "").replace(/\]$/, "").trim();
    if (!inner) return [];
    return inner
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => x.replace(/^["']/, "").replace(/["']$/, ""));
  }
  if (s.startsWith('"') || s.startsWith("'")) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  return s;
}

/** Cấu trúc config đã parse: section -> key -> value, kèm "_top" cho key top-level. */
export type ParsedConfig = Record<string, Record<string, TomlValue>>;

/** Parse tối giản config.toml (đủ cho các field min-clip cần). Bỏ qua comment. */
export async function readConfig(configPath: string): Promise<ParsedConfig> {
  const result: ParsedConfig = { _top: {} };
  let current = result._top;
  let text = "";
  try {
    text = await fs.readFile(configPath, "utf-8");
  } catch {
    return result;
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sec = line.match(/^\[([^\]]+)\]$/);
    if (sec) {
      const name = sec[1].trim();
      if (!result[name]) result[name] = {};
      current = result[name];
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+?)\s*(?:#.*)?$/);
    if (kv) current[kv[1]] = parseValue(kv[2]);
  }
  return result;
}

export interface ConfigUpdate {
  section: string | null; // null = top-level
  key: string;
  value: TomlValue;
}

/** Áp dụng nhiều thay đổi vào config.toml, giữ nguyên comment + phần còn lại. */
export async function applyConfigUpdates(configPath: string, updates: ConfigUpdate[]): Promise<void> {
  let text: string;
  try {
    text = await fs.readFile(configPath, "utf-8");
  } catch {
    text = "[app]\n";
  }
  let lines = text.split(/\r?\n/);
  for (const u of updates) {
    const rendered = renderValue(u.value);
    if (u.section === null) lines = setTopLevelKey(lines, u.key, rendered);
    else lines = setSectionKey(lines, u.section, u.key, rendered);
  }
  await fs.writeFile(configPath, lines.join("\n"), "utf-8");
}

export interface RuntimeConfigPatch {
  host?: string;
  port?: number;
  ffmpegPath?: string;
  imagemagickPath?: string;
  materialDirectory?: string;
}

/** Đảm bảo config.toml tồn tại (copy từ config.example.toml nếu thiếu). */
export async function ensureConfigExists(configPath: string, examplePath: string): Promise<void> {
  try {
    await fs.access(configPath);
  } catch {
    await fs.copyFile(examplePath, configPath);
  }
}

/** Đọc listen_port hiện tại từ config.toml (mặc định 8080 nếu không có). */
export async function readListenPort(configPath: string): Promise<number> {
  try {
    const text = await fs.readFile(configPath, "utf-8");
    const m = text.match(/^\s*listen_port\s*=\s*(\d+)/m);
    if (m) {
      const port = parseInt(m[1], 10);
      if (port > 0 && port < 65536) return port;
    }
  } catch {
    // ignore
  }
  return 8080;
}

/** Áp dụng các thay đổi runtime vào config.toml (giữ nguyên phần còn lại). */
export async function patchConfig(configPath: string, patch: RuntimeConfigPatch): Promise<void> {
  let text: string;
  try {
    text = await fs.readFile(configPath, "utf-8");
  } catch {
    text = "[app]\n";
  }
  let lines = text.split(/\r?\n/);

  if (patch.host !== undefined) lines = setTopLevelKey(lines, "listen_host", tomlString(patch.host));
  if (patch.port !== undefined) lines = setTopLevelKey(lines, "listen_port", String(patch.port));
  if (patch.ffmpegPath !== undefined) lines = setSectionKey(lines, "app", "ffmpeg_path", tomlString(patch.ffmpegPath));
  if (patch.imagemagickPath !== undefined)
    lines = setSectionKey(lines, "app", "imagemagick_path", tomlString(patch.imagemagickPath));
  if (patch.materialDirectory !== undefined)
    lines = setSectionKey(lines, "app", "material_directory", tomlString(patch.materialDirectory));

  await fs.writeFile(configPath, lines.join("\n"), "utf-8");
}
