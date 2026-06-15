"use client";

import { useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { api } from "@/lib/client";
import { optimistic } from "@/lib/swr";
import { IconCheck, IconTrash, IconChevron, IconX, IconBang } from "@/components/Icons";

const KEY = "/api/tasks?view=history";
const WD = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const MODES = [
  { key: "month", label: "Tháng" },
  { key: "week", label: "Tuần" },
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
  const [detailDay, setDetailDay] = useState(null); // ngày đang xem chi tiết

  // Gom các đơn vị việc (đã xong / tạm hoãn) theo ngày — giờ máy = giờ VN.
  const byDay = useMemo(() => {
    const m = new Map();
    for (const it of items ?? []) {
      const k = keyOf(new Date(it.at));
      (m.get(k) ?? m.set(k, []).get(k)).push(it);
    }
    return m;
  }, [items]);
  const countOf = (d) => {
    const arr = byDay.get(keyOf(d)) ?? [];
    return { done: arr.filter((x) => x.type === "done").length, hold: arr.filter((x) => x.type === "hold").length };
  };

  const uncheck = (t) => // việc đã xong -> bỏ tick, về Note
    optimistic(mutate, KEY,
      (prev = []) => prev.filter((x) => x.id !== t.id),
      () => api(`/api/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ completed: false }) }),
      () => gmutate("/api/tasks?view=today"));
  const unhold = (t) => // việc tạm hoãn -> bỏ hoãn, về Note
    optimistic(mutate, KEY,
      (prev = []) => prev.filter((x) => x.id !== t.id),
      () => api(`/api/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ hold: false }) }),
      () => gmutate("/api/tasks?view=today"));
  const remove = (t) =>
    optimistic(mutate, KEY,
      (prev = []) => prev.filter((x) => x.id !== t.id),
      () => api(`/api/tasks/${t.id}`, { method: "DELETE" }),
      () => gmutate("/api/tasks?view=trash"));

  const today = new Date();
  const go = (dir) => {
    setDetailDay(null);
    setCursor((c) => (mode === "month" ? addMonths(c, dir) : addDays(c, 7 * dir)));
  };

  const title =
    mode === "month"
      ? `Tháng ${cursor.getMonth() + 1}, ${cursor.getFullYear()}`
      : `Tuần ${pad(startOfWeek(cursor).getDate())}/${pad(startOfWeek(cursor).getMonth() + 1)} – ${pad(addDays(startOfWeek(cursor), 6).getDate())}/${pad(addDays(startOfWeek(cursor), 6).getMonth() + 1)}`;

  const openDay = (d) => setDetailDay(d);

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
          <div className="seg">
            {MODES.map((m) => (
              <button
                key={m.key}
                className={`seg-btn ${mode === m.key ? "active" : ""}`}
                onClick={() => { setMode(m.key); setDetailDay(null); }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!items && isLoading ? (
        <div className="skeleton"><div className="line" /><div className="line" /></div>
      ) : (
        <>
          <Grid mode={mode} cursor={cursor} today={today} countOf={countOf} onOpen={openDay} />
          {detailDay && (
            <DayDetail
              date={detailDay}
              items={byDay.get(keyOf(detailDay)) ?? []}
              onUncheck={uncheck}
              onUnhold={unhold}
              onRemove={remove}
              onClose={() => setDetailDay(null)}
            />
          )}
        </>
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
          const { done, hold } = countOf(d);
          return (
            <button
              key={keyOf(d)}
              className={`cal-cell ${inMonth ? "" : "muted"} ${sameDay(d, today) ? "today" : ""}`}
              onClick={() => onOpen(d)}
            >
              <span className="cal-day">{d.getDate()}</span>
              {done > 0 && (
                <span className="cal-count"><IconCheck />{done}<span className="cal-cw">&nbsp;công việc</span></span>
              )}
              {hold > 0 && (
                <span className="cal-count hold"><IconBang />{hold}<span className="cal-cw">&nbsp;tạm hoãn</span></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ===== Chi tiết 1 ngày (nhóm việc mẹ + việc con; gồm cả việc tạm hoãn) ===== */
function DayDetail({ date, items, onUncheck, onUnhold, onRemove, onClose }) {
  const blocks = useMemo(() => {
    const sorted = [...items].sort((a, b) => (a.at > b.at ? 1 : -1));
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

  const doneN = items.filter((x) => x.type === "done").length;
  const holdN = items.filter((x) => x.type === "hold").length;
  const heading = date.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const rowProps = { onUncheck, onUnhold, onRemove };

  return (
    <section className="group cal-detail">
      <h2 className="group-h">
        {heading}
        {doneN > 0 && <span className="group-count">{doneN} xong</span>}
        {holdN > 0 && <span className="group-count hold">{holdN} tạm hoãn</span>}
        <button className="cal-detail-x" onClick={onClose} aria-label="Đóng"><IconX /></button>
      </h2>
      {items.length === 0 ? (
        <div className="empty">Ngày này chưa có việc nào.</div>
      ) : (
        <div className="card">
          {blocks.map((b, i) =>
            b.standalone ? (
              <HistRow key={b.item.id} it={b.item} {...rowProps} />
            ) : (
              <div key={`g${i}`} className="hist-parent">
                <div className="hist-parent-title">{b.group.parentTitle || "(việc mẹ)"}</div>
                {b.group.items.map((it) => (
                  <HistRow key={it.id} it={it} sub {...rowProps} />
                ))}
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

function HistRow({ it, sub, onUncheck, onUnhold, onRemove }) {
  const hold = it.type === "hold";
  return (
    <div className={`task-row ${sub ? "sub" : ""}`}>
      {hold ? (
        <button className="hist-bang" title="Bỏ hoãn (đưa về Note)" onClick={() => onUnhold(it)}>
          <IconBang />
        </button>
      ) : (
        <button className="check checked" title="Bỏ hoàn thành (đưa về Note)" onClick={() => onUncheck(it)}>
          <IconCheck />
        </button>
      )}
      <div className="hist-main">
        <div className="hist-title">{it.title}</div>
        {hold && it.note && <div className="hist-note">“{it.note}”</div>}
        <div className="hist-time">{hold ? "Tạm hoãn lúc " : "Lúc "}{fmtTime(it.at)}</div>
      </div>
      <div className="row-actions" style={{ opacity: 1 }}>
        <button title="Xóa" onClick={() => onRemove(it)}><IconTrash /></button>
      </div>
    </div>
  );
}
