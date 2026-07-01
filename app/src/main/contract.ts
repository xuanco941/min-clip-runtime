import path from "node:path";
import fs from "node:fs/promises";
import { API_PATHS } from "../shared/api-contract";
import { resolveAppPaths } from "./paths";

export const CONTRACT_VERSION = "1.0.0";
export const MIN_MPT_VERSION = "1.3.0";

export interface ContractReport {
  contractVersion: string;
  minMptVersion: string;
  runningMptVersion: string | null;
  apiBaseUrl: string | null;
  expected: {
    paths: typeof API_PATHS;
  };
  actual: {
    paths: Record<string, string[]>;
  } | null;
  diff: {
    missingInMpt: string[];
    extraInMpt: string[];
    ok: string[];
  };
  error: string | null;
}

function normalizePath(p: string): string {
  return p.replace(/\{[^}]+\}/g, "{*}").toLowerCase();
}

export async function fetchOpenApi(baseUrl: string): Promise<{ paths: Record<string, string[]> } | null> {
  try {
    const res = await fetch(`${baseUrl}/openapi.json`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { paths?: Record<string, unknown> };
    const out: Record<string, string[]> = {};
    for (const [p, methods] of Object.entries(data.paths ?? {})) {
      out[normalizePath(p)] = Object.keys(methods as object).map((m) => m.toUpperCase());
    }
    return { paths: out };
  } catch {
    return null;
  }
}

async function readProjectVersion(): Promise<string | null> {
  const paths = resolveAppPaths();
  const candidates = [paths.configToml, path.join(paths.mptDir, "config.example.toml")];
  for (const p of candidates) {
    try {
      const text = await fs.readFile(p, "utf-8");
      const m = text.match(/^\s*project_version\s*=\s*"?([^"\n]+)"?/m);
      if (m) return m[1].trim();
    } catch {
      // try next
    }
  }
  return null;
}

function buildDiff(expected: typeof API_PATHS, actual: { paths: Record<string, string[]> } | null) {
  const missingInMpt: string[] = [];
  const ok: string[] = [];
  for (const [name, p] of Object.entries(expected)) {
    const norm = normalizePath(p);
    if (!actual) {
      missingInMpt.push(`${name}: ${p}`);
      continue;
    }
    const found = actual.paths[norm];
    if (found) {
      ok.push(`${name}: ${p}`);
    } else {
      missingInMpt.push(`${name}: ${p}`);
    }
  }
  const extraInMpt: string[] = [];
  if (actual) {
    const expectedNorm = new Set(Object.values(expected).map((p) => normalizePath(p)));
    for (const p of Object.keys(actual.paths)) {
      if (!expectedNorm.has(p)) {
        extraInMpt.push(p);
      }
    }
  }
  return { missingInMpt, extraInMpt, ok };
}

export async function checkContract(apiBaseUrl: string | null): Promise<ContractReport> {
  let actual: { paths: Record<string, string[]> } | null = null;
  let error: string | null = null;
  if (apiBaseUrl) {
    actual = await fetchOpenApi(apiBaseUrl);
    if (!actual) {
      error = "Không đọc được /openapi.json từ API";
    }
  } else {
    error = "API chưa sẵn sàng";
  }

  const diff = buildDiff(API_PATHS, actual);
  const runningVersion = await readProjectVersion();

  return {
    contractVersion: CONTRACT_VERSION,
    minMptVersion: MIN_MPT_VERSION,
    runningMptVersion: runningVersion,
    apiBaseUrl,
    expected: { paths: API_PATHS },
    actual,
    diff,
    error,
  };
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}