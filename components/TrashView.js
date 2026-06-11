"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { IconRestore, IconX } from "@/components/Icons";

export default function TrashView() {
  const [tasks, setTasks] = useState(null);
  const [notes, setNotes] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    Promise.all([api("/api/tasks?view=trash"), api("/api/notes?view=trash")])
      .then(([t, n]) => { setTasks(t); setNotes(n); setError(null); })
      .catch(() => setError("Không tải được thùng rác."));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(fn) {
    try { await fn(); load(); }
    catch { setError("Thao tác thất bại."); }
  }

  const restoreTask = (t) => act(() => api(`/api/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ restore: true }) }));
  const purgeTask = (t) => act(() => api(`/api/tasks/${t.id}?hard=1`, { method: "DELETE" }));
  const restoreNote = (n) => act(() => api(`/api/notes/${n.id}`, { method: "PATCH", body: JSON.stringify({ restore: true }) }));
  const purgeNote = (n) => act(() => api(`/api/notes/${n.id}?hard=1`, { method: "DELETE" }));

  const loading = tasks === null || notes === null;
  const empty = !loading && tasks.length === 0 && notes.length === 0;

  return (
    <div className="content">
      {error && <div className="error-bar">{error}</div>}

      {loading ? (
        <div className="skeleton"><div className="line" /><div className="line" /></div>
      ) : empty ? (
        <div className="empty">Thùng rác trống.</div>
      ) : (
        <>
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

          {notes.length > 0 && (
            <section className="group">
              <h2 className="group-h">Ghi chú <span className="group-count">{notes.length}</span></h2>
              <div className="card">
                {notes.map((n) => (
                  <div key={n.id} className="task-row">
                    <span className="task-title done" style={{ cursor: "default" }}>
                      {n.content.split("\n")[0]}
                    </span>
                    <div className="row-actions" style={{ opacity: 1 }}>
                      <button title="Khôi phục" onClick={() => restoreNote(n)}><IconRestore /></button>
                      <button title="Xóa vĩnh viễn" onClick={() => purgeNote(n)}><IconX /></button>
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
