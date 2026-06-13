"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { IconRestore, IconX } from "@/components/Icons";

export default function TrashView() {
  const [reminders, setReminders] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    Promise.all([api("/api/reminders?view=trash"), api("/api/tasks?view=trash")])
      .then(([r, t]) => { setReminders(r); setTasks(t); setError(null); })
      .catch(() => setError("Không tải được thùng rác."));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(fn) {
    try { await fn(); load(); }
    catch { setError("Thao tác thất bại."); }
  }

  const restoreReminder = (r) => act(() => api(`/api/reminders/${r.id}`, { method: "PATCH", body: JSON.stringify({ restore: true }) }));
  const purgeReminder = (r) => act(() => api(`/api/reminders/${r.id}?hard=1`, { method: "DELETE" }));
  const restoreTask = (t) => act(() => api(`/api/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ restore: true }) }));
  const purgeTask = (t) => act(() => api(`/api/tasks/${t.id}?hard=1`, { method: "DELETE" }));

  const loading = reminders === null || tasks === null;
  const empty = !loading && reminders.length === 0 && tasks.length === 0;

  return (
    <div className="content">
      {error && <div className="error-bar">{error}</div>}

      {loading ? (
        <div className="skeleton"><div className="line" /><div className="line" /></div>
      ) : empty ? (
        <div className="empty">Thùng rác trống.</div>
      ) : (
        <>
          {reminders.length > 0 && (
            <section className="group">
              <h2 className="group-h">Lời nhắc <span className="group-count">{reminders.length}</span></h2>
              <div className="card">
                {reminders.map((r) => (
                  <div key={r.id} className="task-row">
                    <span className="task-title done" style={{ cursor: "default" }}>{r.title}</span>
                    <div className="row-actions" style={{ opacity: 1 }}>
                      <button title="Khôi phục" onClick={() => restoreReminder(r)}><IconRestore /></button>
                      <button title="Xóa vĩnh viễn" onClick={() => purgeReminder(r)}><IconX /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tasks.length > 0 && (
            <section className="group">
              <h2 className="group-h">Công việc <span className="group-count">{tasks.length}</span></h2>
              <div className="card">
                {tasks.map((t) => (
                  <div key={t.id} className="task-row">
                    <span className="task-title done" style={{ cursor: "default" }}>{t.title}</span>
                    <div className="row-actions" style={{ opacity: 1 }}>
                      <button title="Khôi phục" onClick={() => restoreTask(t)}><IconRestore /></button>
                      <button title="Xóa vĩnh viễn" onClick={() => purgeTask(t)}><IconX /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
