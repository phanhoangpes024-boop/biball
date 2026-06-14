"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, localToday, addDays, dueMeta } from "@/lib/client";
import { IconCalendar, IconCheck, IconPlus, IconTrash, IconBell } from "@/components/Icons";

/* Apply fn to the task with the given id, wherever it sits in the tree. */
function mapTask(tasks, id, fn) {
  return tasks.map((t) => {
    if (t.id === id) return fn(t);
    if (t.children?.some((c) => c.id === id)) {
      return { ...t, children: t.children.map((c) => (c.id === id ? fn(c) : c)) };
    }
    return t;
  });
}

function removeTask(tasks, id) {
  return tasks
    .filter((t) => t.id !== id)
    .map((t) =>
      t.children?.some((c) => c.id === id)
        ? { ...t, children: t.children.filter((c) => c.id !== id) }
        : t
    );
}

export default function TasksView() {
  const [tasks, setTasks] = useState(null); // null = loading
  const [error, setError] = useState(null);

  const loadTasks = useCallback(() => {
    return api("/api/tasks?view=today")
      .then((data) => { setTasks(data); setError(null); })
      .catch(() => setError("Không tải được công việc."));
  }, []);

  useEffect(() => { setTasks(null); loadTasks(); }, [loadTasks]);

  /* Optimistic mutation: update UI now, rollback + báo lỗi nếu API fail. */
  const mutate = useCallback((optimisticNext, request) => {
    setTasks((prev) => {
      const next = optimisticNext(prev);
      request().catch(() => {
        setTasks(prev);
        setError("Thao tác thất bại, đã hoàn tác.");
      });
      return next;
    });
  }, []);

  const toggleTask = (task) => {
    const completed = !task.completed;
    const isParent = !task.parent_id;
    mutate(
      (prev) =>
        // Việc cha tick xong -> rời khỏi Note (nhảy sang Lịch sử làm việc).
        completed && isParent
          ? removeTask(prev, task.id)
          : mapTask(prev, task.id, (t) => ({
              ...t,
              completed,
              children: t.children?.map((c) => ({ ...c, completed })) ?? t.children,
            })),
      () => api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ completed }) })
    );
  };

  const renameTask = (task, title) => {
    mutate(
      (prev) => mapTask(prev, task.id, (t) => ({ ...t, title })),
      () => api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ title }) })
    );
  };

  const deleteTask = (task) => {
    mutate(
      (prev) => removeTask(prev, task.id),
      () => api(`/api/tasks/${task.id}`, { method: "DELETE" })
    );
  };

  const setDue = (task, patch) => {
    mutate(
      (prev) =>
        mapTask(prev, task.id, (t) => ({
          ...t,
          due_date: patch.dueDate !== undefined ? patch.dueDate : t.due_date,
          due_time: patch.dueTime !== undefined ? patch.dueTime : t.due_time,
        })),
      () => api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify(patch) })
    );
  };

  /* Adds need the server id, so await the POST then insert locally. */
  const addTask = async ({ title, parentId }) => {
    try {
      const created = await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title, parentId: parentId ?? null }),
      });
      setTasks((prev) => {
        if (!prev) return prev;
        if (parentId) {
          return mapTask(prev, parentId, (t) => ({
            ...t,
            children: [...(t.children ?? []), created],
          }));
        }
        return [...prev, { ...created, children: [] }];
      });
    } catch {
      setError("Không thêm được công việc.");
    }
  };

  /* Note = 2 phần: "Từ lời nhắc" (nhảy qua) ở trên, "Việc của tôi" ở dưới.
     Việc tick xong rời khỏi đây, sang mục Lịch sử làm việc. */
  const groups = useMemo(() => {
    if (!tasks) return [];
    return [
      { key: "reminder", title: "Từ lời nhắc", items: tasks.filter((t) => t.from_reminder && !t.completed) },
      { key: "mine", title: "Việc của tôi", items: tasks.filter((t) => !t.from_reminder && !t.completed) },
    ].filter((g) => g.items.length > 0);
  }, [tasks]);

  return (
    <>
      <div className="content">
        {error && <div className="error-bar">{error}</div>}

        {tasks === null ? (
          <div className="skeleton">
            <div className="line" /><div className="line" /><div className="line" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty">Chưa có công việc nào. Thêm một việc bên dưới nhé 👇</div>
        ) : (
          groups.map((g) => (
            <section key={g.key} className="group">
              {g.title && (
                <h2 className={`group-h ${g.tone || ""}`}>
                  {g.title} <span className="group-count">{g.items.length}</span>
                </h2>
              )}
              <div className="card">
                {g.items.map((t) => (
                  <TaskGroup
                    key={t.id}
                    task={t}
                    onToggle={toggleTask}
                    onRename={renameTask}
                    onDelete={deleteTask}
                    onSetDue={setDue}
                    onDueClose={loadTasks}
                    onAddSub={(title) => addTask({ title, parentId: t.id })}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <Composer onAdd={(title) => addTask({ title })} />
    </>
  );
}

/* ================= Task group (parent + subtasks) ================= */
function TaskGroup({ task, onToggle, onRename, onDelete, onSetDue, onDueClose, onAddSub }) {
  const [adding, setAdding] = useState(false);
  const rowProps = { onToggle, onRename, onDelete, onSetDue, onDueClose };

  return (
    <div className="task-group">
      <TaskRow task={task} {...rowProps} />

      {task.children?.map((c) => (
        <TaskRow key={c.id} task={c} sub {...rowProps} />
      ))}

      {adding ? (
        <SubAddInput onSubmit={onAddSub} onClose={() => setAdding(false)} />
      ) : (
        <button className="add-row sub" onClick={() => setAdding(true)}>
          <span className="plus"><IconPlus /></span>
          Thêm công việc con
        </button>
      )}
    </div>
  );
}

function TaskRow({ task, sub, onToggle, onRename, onDelete, onSetDue, onDueClose }) {
  const [title, setTitle] = useState(task.title);
  const ref = useRef(null);
  useEffect(() => { setTitle(task.title); }, [task.title]);

  const grow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  useEffect(() => { grow(ref.current); }, [title]);

  return (
    <div className={`task-row ${sub ? "sub" : ""}`}>
      <button
        className={`check ${task.completed ? "checked" : ""}`}
        onClick={() => onToggle(task)}
        aria-label={task.completed ? "Bỏ hoàn thành" : "Hoàn thành"}
      >
        {task.completed && <IconCheck />}
      </button>

      <textarea
        ref={ref}
        rows={1}
        className={`task-title ${task.completed ? "done" : ""}`}
        value={title}
        onChange={(e) => { setTitle(e.target.value); grow(e.target); }}
        onBlur={() => {
          const v = title.trim();
          if (v && v !== task.title) onRename(task, v);
          else setTitle(task.title);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
        }}
      />

      {task.from_reminder && (
        <span className="tag" title="Từ lời nhắc"><IconBell /></span>
      )}

      <DueBadge task={task} onSetDue={(p) => onSetDue(task, p)} onClose={onDueClose} />

      <div className="row-actions">
        <button title="Xóa" onClick={() => onDelete(task)}><IconTrash /></button>
      </div>
    </div>
  );
}

/* ================= Due-date badge + popover ================= */
function DueBadge({ task, onSetDue, onClose }) {
  const [open, setOpen] = useState(false);
  const meta = dueMeta(task);
  const today = localToday();

  const close = () => {
    setOpen(false);
    onClose?.(); // refetch so the task moves to the right group/view
  };

  return (
    <div className="due-wrap">
      <button
        className={`due-badge ${meta ? meta.state : "none"}`}
        onClick={() => setOpen(true)}
        title="Đặt ngày hạn"
      >
        <IconCalendar />
        {meta && <span>{meta.label}</span>}
      </button>

      {open && (
        <>
          <div className="pop-overlay" onClick={close} />
          <div className="popover">
            <div className="quick">
              <button onClick={() => { onSetDue({ dueDate: today }); }}>Hôm nay</button>
              <button onClick={() => { onSetDue({ dueDate: addDays(today, 1) }); }}>Ngày mai</button>
              <button onClick={() => { onSetDue({ dueDate: addDays(today, 7) }); }}>Tuần sau</button>
              <button className="muted" onClick={() => { onSetDue({ dueDate: null, dueTime: null }); close(); }}>
                Bỏ hạn
              </button>
            </div>
            <label>
              Ngày
              <input
                type="date"
                value={task.due_date ?? ""}
                onChange={(e) => onSetDue({ dueDate: e.target.value || null })}
              />
            </label>
            <label>
              Giờ
              <input
                type="time"
                value={task.due_time ?? ""}
                onChange={(e) => onSetDue({ dueTime: e.target.value || null })}
              />
            </label>
            <button className="pop-done" onClick={close}>Xong</button>
          </div>
        </>
      )}
    </div>
  );
}

function SubAddInput({ onSubmit, onClose }) {
  const ref = useRef(null);
  const [val, setVal] = useState("");
  useEffect(() => { ref.current?.focus(); }, []);

  function commit(keepOpen) {
    const v = val.trim();
    if (v) onSubmit(v);
    setVal("");
    if (!keepOpen) onClose();
  }

  return (
    <div className="add-row sub">
      <span className="plus"><IconPlus /></span>
      <input
        ref={ref}
        value={val}
        placeholder="Công việc con mới…"
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => commit(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(true); // Enter liên tiếp để thêm nhiều việc
          if (e.key === "Escape") { setVal(""); onClose(); }
        }}
      />
    </div>
  );
}

/* ================= Composer ================= */
function Composer({ onAdd }) {
  const [val, setVal] = useState("");

  function submit() {
    const v = val.trim();
    if (!v) return;
    onAdd(v);
    setVal("");
  }

  return (
    <div className="composer-wrap">
      <div className="composer">
        <input
          value={val}
          placeholder="Thêm công việc mới…"
          enterKeyHint="done"
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button className="send" onClick={submit} disabled={!val.trim()} aria-label="Thêm">
          <IconPlus />
        </button>
      </div>
    </div>
  );
}
