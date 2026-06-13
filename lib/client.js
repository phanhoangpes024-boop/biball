/* Shared client-side helpers. */

export async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

/** Local-timezone yyyy-mm-dd. */
export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Human label for a yyyy-mm-dd relative to today: "Hôm nay", "Ngày mai", "T6, 13/06"… */
export function dateLabel(dateStr) {
  const today = localToday();
  const diff = Math.round(
    (new Date(dateStr + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000
  );
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Ngày mai";
  if (diff === -1) return "Hôm qua";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

/** Due-date badge info for a task: { label, state: overdue|today|future }. */
export function dueMeta(task) {
  if (!task.due_date) return null;
  const today = localToday();
  const state =
    task.due_date < today ? "overdue" : task.due_date === today ? "today" : "future";
  let label = dateLabel(task.due_date);
  if (task.due_time) label += ` · ${task.due_time}`;
  return { label, state };
}

/** Nhãn tiếng Việt cho kiểu lặp lại của lời nhắc. */
export const REPEAT_LABELS = {
  none: "Không",
  daily: "Hàng ngày",
  weekdays: "Ngày thường",
  weekends: "Cuối tuần",
  weekly: "Hàng tuần",
  biweekly: "Hai tuần một lần",
  monthly: "Hàng tháng",
  quarterly: "Mỗi 3 tháng",
  semiannually: "Mỗi 6 tháng",
  yearly: "Hàng năm",
};

/** Dòng ngày/giờ (màu đỏ kiểu iPhone) cho 1 lời nhắc. "10:00 · Hôm nay" */
export function reminderMeta(r) {
  if (!r.due_date) return null;
  const today = localToday();
  const state = r.due_date < today ? "overdue" : r.due_date === today ? "today" : "future";
  let label = dateLabel(r.due_date);
  if (r.due_time) label = `${r.due_time} · ${label}`;
  if (r.repeat && r.repeat !== "none") label += ` · ${REPEAT_LABELS[r.repeat] ?? ""}`;
  return { label, state };
}

/** "2026-06-11 10:28:50" (SQLite UTC) -> local short string. */
export function fmtTimestamp(s) {
  const d = new Date(s.replace(" ", "T") + "Z");
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
