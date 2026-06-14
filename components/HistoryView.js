"use client";

import { useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { api } from "@/lib/client";
import { optimistic } from "@/lib/swr";
import { IconCheck, IconTrash, IconChevron } from "@/components/Icons";

const KEY = "/api/tasks?view=history";
const WD = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const MODES = [
  { key: "month", label: "Tháng" },
  { key: "week", label: "Tuần" },
  { key: "day", label: "Ngày" },
];

const pad = (n) => String(n).padStart(2, "0");
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const startOfWeek = (d) => addDays(d, -((d.getDay() + 6) % 7)); // về Thứ 2
const sameDay = (a, b) => keyOf(a) === keyOf(b);
const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function HistoryView() {
  const { data: items, error, isLoading, mutate } = useSWR(KEY);
  const { mutate: gmutate } = useSWRConfig();
  const [mode, setMode] = useState("month");
  const [cursor, setCursor] = useState(() => new Date());

  // Gom các đơn vị việc đã hoàn thành theo ngày (giờ máy = giờ VN của bạn).
  const byDay = useMemo(() => {
    const m = new Map();
    for (const it of items ?? []) {
      const k = keyOf(new Date(it.completed_at));
      (m.get(k) ?? m.set(k, []).get(k)).push(it);
    }
    return m;
  }, [items]);
  const countOf = (d) => byDay.get(keyOf(d))?.length ?? 0;

  const uncheck = (t) =>
    optimistic(mutate, KEY,
      (prev = []) => prev.filter((x) => x.id !== t.id),
      () => api(`/api/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ completed: false }) }),
      () => gmutate("/api/tasks?view=today"));
  const remove = (t) =>
    optimistic(mutate, KEY,
      (prev = []) => prev.filter((x) => x.id !== t.id),
      () => api(`/api/tasks/${t.id}`, { method: "DELETE" }),
      () => gmutate("/api/tasks?view=trash"));

  const today = new Date();
  const go = (dir) =>
    setCursor((c) => (mode === "month" ? addMonths(c, dir) : mode === "week" ? addDays(c, 7 * dir) : addDays(c, dir)));

  const title =
    mode === "month"
      ? `Tháng ${cursor.getMonth() + 1}, ${cursor.getFullYear()}`
      : mode === "week"
        ? `Tuần ${pad(startOfWeek(cursor).getDate())}/${pad(startOfWeek(cursor).getMonth() + 1)} – ${pad(addDays(startOfWeek(cursor), 6).getDate())}/${pad(addDays(startOfWeek(cursor), 6).getMonth() + 1)}`
        : cursor.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

  const openDay = (d) => { setCursor(d); setMode("day"); };

  return (
    <div className="content">
      {error && !items && <div className="error-bar">Không tải được lịch sử.</div>}

      <div className="cal-head">
        <div className="cal-nav">
          <button onClick={() => go(-1)} aria-label="Trước"><span className="rot"><IconChevron /></span></button>
          <button onClick={() => go(1)} aria-label="Sau"><span className="rot rev"><IconChevron /></span></button>
          <h2 className="cal-title">{title}</h2>
        </div>
        <div className="cal-actions">
          <button className="cal-today" onClick={() => setCursor(new Date())}>Hôm nay</button>
          <div className="seg">
            {MODES.map((m) => (
              <button key={m.key} className={`seg-btn ${mode === m.key ? "active" : ""}`} onClick={() => setMode(m.key)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!items && isLoading ? (
        <div className="skeleton"><div className="line" /><div className="line" /></div>
      ) : mode === "day" ? (
        <DayDetail date={cursor} items={byDay.get(keyOf(cursor)) ?? []} onUncheck={uncheck} onRemove={remove} />
      ) : (
        <Grid mode={mode} cursor={cursor} today={today} countOf={countOf} onOpen={openDay} />
      )}
    </div>
  );
}

/* ===== Lưới lịch (tháng / tuần) ===== */
function Grid({ mode, cursor, today, countOf, onOpen }) {
  const cells = useMemo(() => {
    if (mode === "week") {
      const s = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(s, i));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const end = addDays(startOfWeek(last), 6);
    const out = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(new Date(d));
    return out;
  }, [mode, cursor]);

  return (
    <div className={`cal ${mode}`}>
      <div className="cal-grid cal-weekdays">
        {WD.map((w) => <div key={w} className="cal-wd">{w}</div>)}
      </div>
      <div className="cal-grid">
        {cells.map((d) => {
          const inMonth = mode === "week" || d.getMonth() === cursor.getMonth();
          const n = countOf(d);
          return (
            <button
              key={keyOf(d)}
              className={`cal-cell ${inMonth ? "" : "muted"} ${sameDay(d, today) ? "today" : ""}`}
              onClick={() => onOpen(d)}
            >
              <span className="cal-day">{d.getDate()}</span>
              {n > 0 && (
                <span className="cal-count"><IconCheck />{n}<span className="cal-cw">&nbsp;công việc</span></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ===== Chi tiết 1 ngày (nhóm việc mẹ + việc con) ===== */
function DayDetail({ date, items, onUncheck, onRemove }) {
  const blocks = useMemo(() => {
    const sorted = [...items].sort((a, b) => (a.completed_at > b.completed_at ? 1 : -1));
    const groups = new Map(); // parent_id -> {title, items}
    const out = [];
    for (const it of sorted) {
      if (it.parent_id == null) {
        out.push({ standalone: true, item: it });
      } else {
        let g = groups.get(it.parent_id);
        if (!g) { g = { parentTitle: it.parent_title, items: [] }; groups.set(it.parent_id, g); out.push({ group: g }); }
        g.items.push(it);
      }
    }
    return out;
  }, [items]);

  const heading = date.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <section className="group">
      <h2 className="group-h">{heading} <span className="group-count">{items.length}</span></h2>
      {items.length === 0 ? (
        <div className="empty">Ngày này chưa hoàn thành việc nào.</div>
      ) : (
        <div className="card">
          {blocks.map((b, i) =>
            b.standalone ? (
              <HistRow key={b.item.id} it={b.item} onUncheck={onUncheck} onRemove={onRemove} />
            ) : (
              <div key={`g${i}`} className="hist-parent">
                <div className="hist-parent-title">{b.group.parentTitle || "(việc mẹ)"}</div>
                {b.group.items.map((it) => (
                  <HistRow key={it.id} it={it} sub onUncheck={onUncheck} onRemove={onRemove} />
                ))}
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

function HistRow({ it, sub, onUncheck, onRemove }) {
  return (
    <div className={`task-row ${sub ? "sub" : ""}`}>
      <button className="check checked" title="Bỏ hoàn thành (đưa về Note)" onClick={() => onUncheck(it)}>
        <IconCheck />
      </button>
      <div className="hist-main">
        <div className="hist-title">{it.title}</div>
        <div className="hist-time">Lúc {fmtTime(it.completed_at)}</div>
      </div>
      <div className="row-actions" style={{ opacity: 1 }}>
        <button title="Xóa" onClick={() => onRemove(it)}><IconTrash /></button>
      </div>
    </div>
  );
}
