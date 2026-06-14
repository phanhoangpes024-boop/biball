"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, dateLabel } from "@/lib/client";
import { IconCheck, IconTrash } from "@/components/Icons";

const PERIODS = [
  { key: "day", label: "Ngày" },
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
];

function localKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** completed_at có nằm trong khoảng đang lọc (theo giờ máy)? */
function inPeriod(date, period) {
  const now = new Date();
  if (period === "day") return localKey(date) === localKey(now);
  if (period === "month")
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  // "week": tuần này, Thứ 2 -> Chủ nhật
  const offset = (now.getDay() + 6) % 7; // 0 = Thứ 2
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function HistoryView() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("day");

  const load = useCallback(
    () =>
      api("/api/tasks?view=history")
        .then((d) => { setItems(d); setError(null); })
        .catch(() => setError("Không tải được lịch sử.")),
    []
  );
  useEffect(() => { load(); }, [load]);

  async function act(fn) {
    try { await fn(); await load(); }
    catch { setError("Thao tác thất bại."); }
  }
  const uncheck = (t) =>
    act(() => api(`/api/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ completed: false }) }));
  const remove = (t) =>
    act(() => api(`/api/tasks/${t.id}`, { method: "DELETE" }));

  const groups = useMemo(() => {
    if (!items) return [];
    const map = new Map();
    for (const t of items) {
      if (!t.completed_at) continue;
      const d = new Date(t.completed_at);
      if (!inPeriod(d, period)) continue;
      const key = localKey(d);
      (map.get(key) ?? map.set(key, []).get(key)).push(t);
    }
    // Ngày mới nhất lên trước; trong ngày, items đã sắp theo completed_at giảm dần.
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, arr]) => ({ key, arr }));
  }, [items, period]);

  const total = groups.reduce((n, g) => n + g.arr.length, 0);

  return (
    <div className="content">
      {error && <div className="error-bar">{error}</div>}

      <div className="seg">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={`seg-btn ${period === p.key ? "active" : ""}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="skeleton"><div className="line" /><div className="line" /></div>
      ) : total === 0 ? (
        <div className="empty">Chưa có việc nào hoàn thành trong khoảng này.</div>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="group">
            <h2 className="group-h">
              {dateLabel(g.key)} <span className="group-count">{g.arr.length}</span>
            </h2>
            <div className="card">
              {g.arr.map((t) => (
                <div key={t.id} className="task-row">
                  <button
                    className="check checked"
                    title="Bỏ hoàn thành (đưa về Note)"
                    onClick={() => uncheck(t)}
                  >
                    <IconCheck />
                  </button>
                  <div className="hist-main">
                    <div className="hist-title">{t.title}</div>
                    <div className="hist-time">Lúc {fmtTime(t.completed_at)}</div>
                  </div>
                  <div className="row-actions" style={{ opacity: 1 }}>
                    <button title="Xóa" onClick={() => remove(t)}><IconTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
