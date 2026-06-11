"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, fmtTimestamp } from "@/lib/client";
import { IconPlus, IconTrash } from "@/components/Icons";

export default function NotesView() {
  const [notes, setNotes] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    return api("/api/notes")
      .then((data) => { setNotes(data); setError(null); })
      .catch(() => setError("Không tải được ghi chú."));
  }, []);

  useEffect(() => { load(); }, [load]);

  const addNote = async (content) => {
    try {
      const created = await api("/api/notes", {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setNotes((prev) => [created, ...(prev ?? [])]);
    } catch {
      setError("Không thêm được ghi chú.");
    }
  };

  const saveNote = async (note, content) => {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, content } : n)));
    try {
      await api(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      });
    } catch {
      setError("Không lưu được ghi chú.");
      load();
    }
  };

  const deleteNote = async (note) => {
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    try {
      await api(`/api/notes/${note.id}`, { method: "DELETE" });
    } catch {
      setError("Không xóa được ghi chú.");
      load();
    }
  };

  return (
    <>
      <div className="content">
        {error && <div className="error-bar">{error}</div>}

        {notes === null ? (
          <div className="skeleton">
            <div className="line" /><div className="line" />
          </div>
        ) : notes.length === 0 ? (
          <div className="empty">Chưa có ghi chú nào. Viết gì đó bên dưới nhé 👇</div>
        ) : (
          <div className="notes-grid">
            {notes.map((n) => (
              <NoteCard key={n.id} note={n} onSave={saveNote} onDelete={deleteNote} />
            ))}
          </div>
        )}
      </div>

      <NoteComposer onAdd={addNote} />
    </>
  );
}

function NoteCard({ note, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(note.content);
  const ref = useRef(null);

  useEffect(() => { setVal(note.content); }, [note.content]);
  useEffect(() => {
    if (editing && ref.current) {
      const el = ref.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.style.height = el.scrollHeight + "px";
    }
  }, [editing]);

  const [title, ...rest] = note.content.split("\n");
  const body = rest.join("\n").trim();

  function commit() {
    setEditing(false);
    const v = val.trim();
    if (v && v !== note.content) onSave(note, v);
    else setVal(note.content);
  }

  if (editing) {
    return (
      <div className="note-card editing">
        <textarea
          ref={ref}
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setVal(note.content); setEditing(false); }
          }}
        />
      </div>
    );
  }

  return (
    <div className="note-card" onClick={() => setEditing(true)}>
      <div className="note-title">{title}</div>
      {body && <div className="note-body">{body}</div>}
      <div className="note-foot">
        <span>{fmtTimestamp(note.updated_at)}</span>
        <button
          title="Xóa"
          onClick={(e) => { e.stopPropagation(); onDelete(note); }}
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}

function NoteComposer({ onAdd }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);

  function submit() {
    const v = val.trim();
    if (!v) return;
    onAdd(v);
    setVal("");
    if (ref.current) ref.current.style.height = "auto";
  }

  return (
    <div className="composer-wrap">
      <div className="composer note-composer">
        <textarea
          ref={ref}
          rows={1}
          value={val}
          placeholder="Viết ghi chú mới… (Ctrl+Enter để lưu)"
          onChange={(e) => {
            setVal(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          }}
        />
        <button className="send" onClick={submit} disabled={!val.trim()} aria-label="Lưu ghi chú">
          <IconPlus />
        </button>
      </div>
    </div>
  );
}
