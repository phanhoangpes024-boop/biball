"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, reminderMeta, REPEAT_LABELS } from "@/lib/client";
import { IconPlus, IconTrash, IconCheck, IconCircle, IconInfo, IconX } from "@/components/Icons";

export default function RemindersView() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null); // lời nhắc đang mở bảng chi tiết

  const load = useCallback(() => {
    return api("/api/reminders")
      .then((data) => { setItems(data); setError(null); })
      .catch(() => setError("Không tải được lời nhắc."));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(fn, failMsg) {
    try { await fn(); await load(); }
    catch { setError(failMsg); }
  }

  const addReminder = (title) =>
    act(() => api("/api/reminders", { method: "POST", body: JSON.stringify({ title }) }), "Không thêm được.");

  const patch = (id, body) =>
    act(() => api(`/api/reminders/${id}`, { method: "PATCH", body: JSON.stringify(body) }), "Không lưu được.");

  const remove = (id) =>
    act(() => api(`/api/reminders/${id}`, { method: "DELETE" }), "Không xóa được.");

  // Giữ bảng chi tiết đồng bộ với dữ liệu mới sau mỗi lần lưu.
  useEffect(() => {
    if (detail && items) {
      const fresh = items.find((r) => r.id === detail.id);
      if (fresh && fresh !== detail) setDetail(fresh);
    }
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="content">
        {error && <div className="error-bar">{error}</div>}
        <p className="hint">
          Đặt ngày/giờ cho lời nhắc. Tới ngày, nó tự chuyển sang mục <b>Note</b>.
        </p>

        {items === null ? (
          <div className="skeleton"><div className="line" /><div className="line" /></div>
        ) : items.length === 0 ? (
          <div className="empty">Chưa có lời nhắc nào. Thêm một cái bên dưới nhé 👇</div>
        ) : (
          <div className="card">
            {items.map((r) => (
              <ReminderRow
                key={r.id}
                r={r}
                onToggle={() => patch(r.id, { completed: !r.completed })}
                onRename={(title) => patch(r.id, { title })}
                onOpen={() => setDetail(r)}
                onDelete={() => remove(r.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Composer onAdd={addReminder} />

      {detail && (
        <DetailSheet
          r={detail}
          onPatch={(body) => patch(detail.id, body)}
          onDelete={() => { remove(detail.id); setDetail(null); }}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}

/* ================= Một dòng lời nhắc ================= */
function ReminderRow({ r, onToggle, onRename, onOpen, onDelete }) {
  const [title, setTitle] = useState(r.title);
  const ref = useRef(null);
  useEffect(() => { setTitle(r.title); }, [r.title]);

  const grow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  useEffect(() => { grow(ref.current); }, [title]);

  const meta = reminderMeta(r);

  return (
    <div className="rem-row">
      <button
        className={`rem-check ${r.completed ? "checked" : ""}`}
        onClick={onToggle}
        aria-label={r.completed ? "Bỏ hoàn thành" : "Hoàn thành"}
      >
        {r.completed && <IconCheck />}
      </button>

      <div className="rem-main">
        <div className="rem-titlewrap">
          {r.priority && <span className="rem-bang">!!!</span>}
          <textarea
            ref={ref}
            rows={1}
            className={`rem-title ${r.completed ? "done" : ""}`}
            value={title}
            onChange={(e) => { setTitle(e.target.value); grow(e.target); }}
            onBlur={() => {
              const v = title.trim();
              if (v && v !== r.title) onRename(v);
              else setTitle(r.title);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
            }}
          />
        </div>
        {meta && <div className={`rem-meta ${meta.state}`}>{meta.label}</div>}
      </div>

      <button className="rem-info" onClick={onOpen} title="Chi tiết" aria-label="Chi tiết">
        <IconInfo />
      </button>
      <button className="rem-del" onClick={onDelete} title="Xóa" aria-label="Xóa">
        <IconTrash />
      </button>
    </div>
  );
}

/* ================= Bảng chi tiết (Ngày / Giờ / Lặp lại / Ưu tiên) ================= */
function DetailSheet({ r, onPatch, onDelete, onClose }) {
  const hasDate = !!r.due_date;
  const hasTime = !!r.due_time;

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const toggleDate = (on) =>
    onPatch(on ? { dueDate: r.due_date || todayStr() } : { dueDate: null, dueTime: null });
  const toggleTime = (on) =>
    onPatch(on ? { dueDate: r.due_date || todayStr(), dueTime: r.due_time || "09:00" } : { dueTime: null });

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="Chi tiết lời nhắc">
        <div className="sheet-head">
          <button className="sheet-x" onClick={onClose} aria-label="Đóng"><IconX /></button>
          <span className="sheet-title">Chi tiết</span>
          <button className="sheet-done" onClick={onClose}>Xong</button>
        </div>

        <div className="sheet-body">
          <div className="sheet-group">Ngày & giờ</div>

          <div className="sheet-row">
            <span className="sheet-label">Ngày</span>
            <div className="sheet-right">
              {hasDate && (
                <input
                  type="date"
                  className="sheet-input"
                  value={r.due_date ?? ""}
                  onChange={(e) => onPatch({ dueDate: e.target.value || null })}
                />
              )}
              <Switch on={hasDate} onChange={toggleDate} />
            </div>
          </div>

          <div className="sheet-row">
            <span className="sheet-label">Thời gian</span>
            <div className="sheet-right">
              {hasTime && (
                <input
                  type="time"
                  className="sheet-input"
                  value={r.due_time ?? ""}
                  onChange={(e) => onPatch({ dueTime: e.target.value || null })}
                />
              )}
              <Switch on={hasTime} onChange={toggleTime} />
            </div>
          </div>

          <div className="sheet-row">
            <span className="sheet-label">Lặp lại</span>
            <select
              className="sheet-select"
              value={r.repeat || "none"}
              onChange={(e) => onPatch({ repeat: e.target.value })}
            >
              {Object.entries(REPEAT_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>

          <div className="sheet-group">Tổ chức</div>

          <div className="sheet-row">
            <span className="sheet-label">
              <span className="rem-bang sheet-bang">!!!</span> Mức ưu tiên
            </span>
            <Switch on={!!r.priority} onChange={(on) => onPatch({ priority: on })} />
          </div>

          <button className="sheet-delete" onClick={onDelete}>
            <IconTrash /> Xóa lời nhắc
          </button>
        </div>
      </div>
    </>
  );
}

function Switch({ on, onChange }) {
  return (
    <button
      className={`switch ${on ? "on" : ""}`}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    >
      <span className="knob" />
    </button>
  );
}

/* ================= Ô thêm lời nhắc ================= */
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
          placeholder="Lời nhắc mới…"
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
