"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { IconPlus, IconTrash } from "@/components/Icons";

const DAYS = [
  { wd: 1, label: "Thứ 2" },
  { wd: 2, label: "Thứ 3" },
  { wd: 3, label: "Thứ 4" },
  { wd: 4, label: "Thứ 5" },
  { wd: 5, label: "Thứ 6" },
  { wd: 6, label: "Thứ 7" },
  { wd: 0, label: "Chủ nhật" },
];

export default function ScheduleView() {
  const [routines, setRoutines] = useState(null);
  const [error, setError] = useState(null);
  const todayWd = new Date().getDay();

  const load = useCallback(() => {
    return api("/api/routines")
      .then((data) => { setRoutines(data); setError(null); })
      .catch(() => setError("Không tải được thời khóa biểu."));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(fn, failMsg) {
    try { await fn(); await load(); }
    catch { setError(failMsg); }
  }

  const addRoutine = (weekday, title, dueTime) =>
    act(
      () => api("/api/routines", {
        method: "POST",
        body: JSON.stringify({ title, weekday, dueTime: dueTime || null }),
      }),
      "Không thêm được."
    );

  const patchRoutine = (id, body) =>
    act(
      () => api(`/api/routines/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
      "Không lưu được."
    );

  const deleteRoutine = (id) =>
    act(() => api(`/api/routines/${id}`, { method: "DELETE" }), "Không xóa được.");

  return (
    <div className="content">
      {error && <div className="error-bar">{error}</div>}
      <p className="hint">
        Công việc cố định mỗi tuần. Đến đúng thứ, chúng tự xuất hiện trong <b>Hôm nay</b> để bạn tick.
      </p>

      {routines === null ? (
        <div className="skeleton"><div className="line" /><div className="line" /></div>
      ) : (
        DAYS.map(({ wd, label }) => {
          const items = routines.filter((r) => r.weekday === wd);
          const isToday = wd === todayWd;
          return (
            <section key={wd} className="group">
              <h2 className="group-h">
                {label}
                {isToday && <span className="today-pill">hôm nay</span>}
                {items.length > 0 && <span className="group-count">{items.length}</span>}
              </h2>
              <div className="card">
                {items.map((r) => (
                  <RoutineRow
                    key={r.id}
                    routine={r}
                    onPatch={patchRoutine}
                    onDelete={deleteRoutine}
                  />
                ))}
                <AddRoutine onAdd={(title, time) => addRoutine(wd, title, time)} />
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function RoutineRow({ routine, onPatch, onDelete }) {
  const [title, setTitle] = useState(routine.title);
  useEffect(() => { setTitle(routine.title); }, [routine.title]);

  return (
    <div className="task-row routine-row">
      <input
        className="routine-time"
        type="time"
        value={routine.due_time ?? ""}
        onChange={(e) => onPatch(routine.id, { dueTime: e.target.value || null })}
        title="Giờ"
      />
      <input
        className="task-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          const v = title.trim();
          if (v && v !== routine.title) onPatch(routine.id, { title: v });
          else setTitle(routine.title);
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <div className="row-actions">
        <button title="Xóa" onClick={() => onDelete(routine.id)}><IconTrash /></button>
      </div>
    </div>
  );
}

function AddRoutine({ onAdd }) {
  const [val, setVal] = useState("");
  const [time, setTime] = useState("");

  function submit() {
    const v = val.trim();
    if (!v) return;
    onAdd(v, time);
    setVal("");
    setTime("");
  }

  return (
    <div className="add-row routine-add">
      <span className="plus"><IconPlus /></span>
      <input
        value={val}
        placeholder="Thêm việc cố định…"
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <input
        className="routine-time"
        type="time"
        value={time}
        title="Giờ (tùy chọn)"
        onChange={(e) => setTime(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
    </div>
  );
}
