"use client";

import useSWR, { useSWRConfig } from "swr";
import { api } from "@/lib/client";
import { optimistic } from "@/lib/swr";
import { IconRestore, IconX } from "@/components/Icons";

const RKEY = "/api/reminders?view=trash";
const TKEY = "/api/tasks?view=trash";

export default function TrashView() {
  const { data: reminders, error: rErr, isLoading: rLoad, mutate: mutateR } = useSWR(RKEY);
  const { data: tasks, error: tErr, isLoading: tLoad, mutate: mutateT } = useSWR(TKEY);
  const { mutate: gmutate } = useSWRConfig();

  const restoreReminder = (r) =>
    optimistic(mutateR, RKEY, (prev = []) => prev.filter((x) => x.id !== r.id),
      () => api(`/api/reminders/${r.id}`, { method: "PATCH", body: JSON.stringify({ restore: true }) }),
      () => gmutate("/api/reminders"));
  const purgeReminder = (r) =>
    optimistic(mutateR, RKEY, (prev = []) => prev.filter((x) => x.id !== r.id),
      () => api(`/api/reminders/${r.id}?hard=1`, { method: "DELETE" }));
  const restoreTask = (t) =>
    optimistic(mutateT, TKEY, (prev = []) => prev.filter((x) => x.id !== t.id),
      () => api(`/api/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ restore: true }) }),
      () => { gmutate("/api/tasks?view=today"); gmutate("/api/tasks?view=history"); });
  const purgeTask = (t) =>
    optimistic(mutateT, TKEY, (prev = []) => prev.filter((x) => x.id !== t.id),
      () => api(`/api/tasks/${t.id}?hard=1`, { method: "DELETE" }));

  const error = rErr || tErr;
  const loading = (!reminders && rLoad) || (!tasks && tLoad);
  const empty = !loading && (reminders?.length ?? 0) === 0 && (tasks?.length ?? 0) === 0;

  return (
    <div className="content">
      {error && !reminders && !tasks && <div className="error-bar">Không tải được thùng rác.</div>}

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
