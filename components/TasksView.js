"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { api, localToday, addDays, dueMeta } from "@/lib/client";
import { optimistic } from "@/lib/swr";
import { IconCalendar, IconCheck, IconPlus, IconTrash, IconBang, IconDots } from "@/components/Icons";

const TASKS_KEY = "/api/tasks?view=today";
const HISTORY_KEY = "/api/tasks?view=history";
const TRASH_KEY = "/api/tasks?view=trash";

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
  const { data: tasks, error, isLoading, mutate } = useSWR(TASKS_KEY);
  const { mutate: gmutate } = useSWRConfig();

  const toggleTask = (task) => {
    const completed = !task.completed;
    const isParent = !task.parent_id;
    optimistic(
      mutate,
      TASKS_KEY,
      (prev = []) =>
        // Việc cha tick xong -> rời khỏi Note (nhảy sang Lịch sử làm việc).
        completed && isParent
          ? removeTask(prev, task.id)
          : mapTask(prev, task.id, (t) => ({
              ...t,
              completed,
              children: t.children?.map((c) => ({ ...c, completed })) ?? t.children,
            })),
      () => api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ completed }) }),
      () => gmutate(HISTORY_KEY) // tick xong -> Lịch sử cập nhật
    );
  };

  const renameTask = (task, title) =>
    optimistic(
      mutate,
      TASKS_KEY,
      (prev = []) => mapTask(prev, task.id, (t) => ({ ...t, title })),
      () => api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ title }) })
    );

  const deleteTask = (task) =>
    optimistic(
      mutate,
      TASKS_KEY,
      (prev = []) => removeTask(prev, task.id),
      () => api(`/api/tasks/${task.id}`, { method: "DELETE" }),
      () => gmutate(TRASH_KEY)
    );

  // Tạm hoãn (kèm lý do) -> rời Note, sang Lịch sử làm việc.
  const holdTask = (task, note) =>
    optimistic(
      mutate,
      TASKS_KEY,
      (prev = []) => removeTask(prev, task.id),
      () => api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ hold: true, holdNote: note }) }),
      () => gmutate(HISTORY_KEY)
    );

  const setDue = (task, patch) =>
    optimistic(
      mutate,
      TASKS_KEY,
      (prev = []) =>
        mapTask(prev, task.id, (t) => ({
          ...t,
          due_date: patch.dueDate !== undefined ? patch.dueDate : t.due_date,
          due_time: patch.dueTime !== undefined ? patch.dueTime : t.due_time,
        })),
      () => api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify(patch) })
    );

  // Thêm lạc quan: chèn ngay với id tạm, revalidate để lấy id thật.
  const addTask = ({ title, parentId }) => {
    const tempId = `tmp-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const row = {
      id: tempId, title, parent_id: parentId ?? null, completed: false,
      from_reminder: false, due_date: null, due_time: null, children: [],
    };
    optimistic(
      mutate,
      TASKS_KEY,
      (prev = []) =>
        parentId
          ? mapTask(prev, parentId, (t) => ({ ...t, children: [...(t.children ?? []), row] }))
          : [...prev, row],
      () => api("/api/tasks", { method: "POST", body: JSON.stringify({ title, parentId: parentId ?? null }) })
    );
  };

  /* Note = 2 phần: "Từ lời nhắc" (nhảy qua) ở trên, "Việc của tôi" ở dưới.
     Việc tick xong rời khỏi đây, sang mục Lịch sử làm việc. */
  const groups = useMemo(() => {
    const list = tasks ?? [];
    return [
      { key: "reminder", title: "Từ lời nhắc", items: list.filter((t) => t.from_reminder && !t.completed) },
      { key: "mine", title: "Việc của tôi", items: list.filter((t) => !t.from_reminder && !t.completed) },
    ].filter((g) => g.items.length > 0);
  }, [tasks]);

  return (
    <>
      <div className="content">
        {error && !tasks && <div className="error-bar">Không tải được công việc.</div>}

        {!tasks && isLoading ? (
          <div className="skeleton">
            <div className="line" /><div className="line" /><div className="line" />
          </div>
        ) : (tasks?.length ?? 0) === 0 ? (
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
                    onHold={holdTask}
                    onSetDue={setDue}
                    onDueClose={() => mutate()}
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
function TaskGroup({ task, onToggle, onRename, onDelete, onHold, onSetDue, onDueClose, onAddSub }) {
  const [adding, setAdding] = useState(false);
  const rowProps = { onToggle, onRename, onDelete, onHold, onSetDue, onDueClose };
  const kids = task.children ?? [];

  return (
    <div className="task-group">
      <TaskRow task={task} hasKids={kids.length > 0} onAddSub={() => setAdding(true)} {...rowProps} />

      {kids.map((c, i) => (
        <TaskRow key={c.id} task={c} sub last={!adding && i === kids.length - 1} {...rowProps} />
      ))}

      {adding && <SubAddInput onSubmit={onAddSub} onClose={() => setAdding(false)} />}
    </div>
  );
}

function TaskRow({ task, sub, last, hasKids, onToggle, onRename, onDelete, onHold, onSetDue, onDueClose, onAddSub }) {
  const [title, setTitle] = useState(task.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { setTitle(task.title); }, [task.title]);

  const grow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  useEffect(() => { grow(ref.current); }, [title]);

  const meta = dueMeta(task);

  return (
    <div className={`task-row ${sub ? "sub branch" : ""} ${sub && last ? "last" : ""} ${hasKids ? "has-kids" : ""}`}>
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

      {/* Hẹn giờ đã đặt -> hiện nhãn, bấm để sửa. Việc từ lời nhắc thì ẩn nhãn ngày. */}
      {meta && !task.from_reminder && (
        <button className={`due-badge ${meta.state}`} onClick={() => setDueOpen(true)} title="Sửa ngày">
          <IconCalendar />
          <span>{meta.label}</span>
        </button>
      )}

      {/* Nút 3 chấm: gom Hẹn giờ / Tạm hoãn / Thêm việc con / Xóa */}
      <div className="due-wrap">
        <button className="row-more" onClick={() => setMenuOpen(true)} title="Tùy chọn" aria-label="Tùy chọn">
          <IconDots />
        </button>

        {menuOpen && (
          <>
            <div className="pop-overlay" onClick={() => setMenuOpen(false)} />
            <div className="row-menu">
              <button onClick={() => { setMenuOpen(false); setDueOpen(true); }}>
                <IconCalendar /> Hẹn giờ
              </button>
              <button className="warn" onClick={() => { setMenuOpen(false); setHoldOpen(true); }}>
                <IconBang /> Tạm hoãn
              </button>
              {!sub && onAddSub && (
                <button onClick={() => { setMenuOpen(false); onAddSub(); }}>
                  <IconPlus /> Thêm việc con
                </button>
              )}
              <button className="danger" onClick={() => { setMenuOpen(false); onDelete(task); }}>
                <IconTrash /> Xóa
              </button>
            </div>
          </>
        )}

        {dueOpen && (
          <DueEditor
            task={task}
            onSetDue={(p) => onSetDue(task, p)}
            onClose={() => { setDueOpen(false); onDueClose?.(); }}
          />
        )}

        {holdOpen && (
          <HoldEditor
            onConfirm={(note) => { setHoldOpen(false); onHold(task, note); }}
            onClose={() => setHoldOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

/* ================= Popup Tạm hoãn (ghi lý do) ================= */
function HoldEditor({ onConfirm, onClose }) {
  const [note, setNote] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <>
      <div className="pop-overlay" onClick={onClose} />
      <div className="popover hold-pop">
        <div className="hold-head"><IconBang /> Tạm hoãn việc này</div>
        <textarea
          ref={ref}
          className="hold-note"
          rows={3}
          placeholder="Lý do tạm hoãn (tùy chọn)…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onConfirm(note); }}
        />
        <div className="hold-actions">
          <button className="muted" onClick={onClose}>Hủy</button>
          <button className="pop-done warn-btn" onClick={() => onConfirm(note)}>Tạm hoãn</button>
        </div>
      </div>
    </>
  );
}

/* ================= Trình đặt hẹn giờ (popover) ================= */
function DueEditor({ task, onSetDue, onClose }) {
  const today = localToday();
  return (
    <>
      <div className="pop-overlay" onClick={onClose} />
      <div className="popover">
        <div className="quick">
          <button onClick={() => onSetDue({ dueDate: today })}>Hôm nay</button>
          <button onClick={() => onSetDue({ dueDate: addDays(today, 1) })}>Ngày mai</button>
          <button onClick={() => onSetDue({ dueDate: addDays(today, 7) })}>Tuần sau</button>
          <button className="muted" onClick={() => { onSetDue({ dueDate: null, dueTime: null }); onClose(); }}>
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
        <button className="pop-done" onClick={onClose}>Xong</button>
      </div>
    </>
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
    <div className="add-row sub branch last">
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
