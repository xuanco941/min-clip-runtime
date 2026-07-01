import { useEffect, useRef } from "react";
import { useTasks } from "./store";
import { pushToast } from "./toast-store";
import {
  TASK_STATE_COMPLETE,
  TASK_STATE_FAILED,
  type TaskData,
  type TaskState,
} from "./api-types";

/** Lấy dòng đầu, rút gọn cho gọn toast (log backend có thể nhiều dòng). */
function firstLine(message: string, max = 160): string {
  const line = (message || "").split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return line.length > max ? `${line.slice(0, max)}…` : line;
}

function subjectOf(task: TaskData): string {
  const s = task.params?.video_subject?.trim();
  if (s) return s.length > 40 ? `${s.slice(0, 40)}…` : s;
  return task.task_id.slice(0, 8);
}

/**
 * Thông báo toàn cục — gắn 1 lần trong App.
 * (a) Lỗi realtime từ backend qua onApiLog (level === "error").
 * (b) Vòng đời task: COMPLETE → toast xanh, FAILED → toast đỏ.
 */
export function useGlobalNotifications() {
  // (a) Lỗi realtime từ backend.
  useEffect(() => {
    const off = window.minclip.events.onApiLog((entry) => {
      if (entry.level !== "error") return;
      const text = firstLine(entry.message);
      if (!text) return;
      pushToast("error", text);
    });
    return off;
  }, []);

  // (b) Theo dõi chuyển trạng thái task.
  const { data } = useTasks(1, 100);
  const prevStates = useRef<Map<string, TaskState>>(new Map());
  const seeded = useRef(false);

  useEffect(() => {
    const tasks = data?.tasks;
    if (!tasks) return;

    // Lần đầu chỉ ghi nhận trạng thái hiện có, không bắn toast cho task cũ.
    if (!seeded.current) {
      for (const t of tasks) {
        if (t.state !== undefined) prevStates.current.set(t.task_id, t.state);
      }
      seeded.current = true;
      return;
    }

    for (const t of tasks) {
      if (t.state === undefined) continue;
      const prev = prevStates.current.get(t.task_id);
      if (prev === t.state) continue;
      prevStates.current.set(t.task_id, t.state);
      if (prev === undefined) continue; // task mới xuất hiện — chưa coi là chuyển trạng thái

      if (t.state === TASK_STATE_COMPLETE) {
        pushToast("success", `Video "${subjectOf(t)}" đã xong`);
      } else if (t.state === TASK_STATE_FAILED) {
        pushToast("error", `Tác vụ "${subjectOf(t)}" lỗi — mở Tác vụ để xem chi tiết`);
      }
    }
  }, [data]);
}
