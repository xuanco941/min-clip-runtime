import { app, BrowserWindow, screen } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const DEFAULT_STATE: WindowState = {
  width: 1366,
  height: 860,
  isMaximized: false,
};

function stateFile(): string {
  return path.join(app.getPath("userData"), "window-state.json");
}

function isVisibleOnAnyDisplay(bounds: { x: number; y: number; width: number; height: number }): boolean {
  return screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return (
      bounds.x >= a.x &&
      bounds.y >= a.y &&
      bounds.x + bounds.width <= a.x + a.width &&
      bounds.y + bounds.height <= a.y + a.height
    );
  });
}

export async function loadWindowState(): Promise<WindowState> {
  try {
    const text = await fs.readFile(stateFile(), "utf-8");
    const parsed = JSON.parse(text) as WindowState;
    if (
      typeof parsed.width === "number" &&
      typeof parsed.height === "number" &&
      parsed.width >= 800 &&
      parsed.height >= 600 &&
      (!parsed.x || !parsed.y || isVisibleOnAnyDisplay(parsed as Required<Pick<WindowState, "x" | "y" | "width" | "height">>))
    ) {
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch {
    // first run
  }
  return DEFAULT_STATE;
}

let saveTimer: NodeJS.Timeout | null = null;

export function attachWindowStateSaver(win: BrowserWindow): void {
  const save = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        if (win.isDestroyed()) return;
        const bounds = win.getNormalBounds();
        const state: WindowState = {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized: win.isMaximized(),
        };
        await fs.writeFile(stateFile(), JSON.stringify(state, null, 2), "utf-8");
      } catch {
        // ignore
      }
    }, 500);
  };

  win.on("resize", save);
  win.on("move", save);
  win.on("maximize", save);
  win.on("unmaximize", save);
  win.on("close", save);
}