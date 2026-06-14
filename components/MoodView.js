"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { api, localToday } from "@/lib/client";
import { IconPlus, IconCalendar } from "@/components/Icons";

const MOODS = [
  ["calm", "😌", "Bình tĩnh"],
  ["ok", "🙂", "Ổn"],
  ["overload", "😵", "Quá tải"],
  ["angry", "😤", "Bực bội"],
  ["down", "😔", "Chán nản"],
  ["motivated", "💪", "Có động lực"],
  ["anxious", "😰", "Lo lắng"],
  ["scrambled", "🤯", "Rối não"],
];
const HARDEST_CATS = ["Số liệu", "Nhân sự", "Khiếu nại khách hàng", "Báo cáo", "Sếp giao", "Việc phát sinh", "Khác"];
const MISTAKE_CAUSES = ["Thiếu tập trung", "Thiếu thời gian", "Quá nhiều việc", "Chưa biết cách làm", "Khách quan"];

export default function MoodView() {
  const [date, setDate] = useState(localToday());
  // SWR cache theo ngày -> mở lại ngày đã xem là hiện ngay (không tải lại).
  const { data: row, mutate } = useSWR(`/api/mood?date=${date}`, undefined, { keepPreviousData: false });
  const [data, setData] = useState(null); // null = đang tải
  const [status, setStatus] = useState(""); // "saving" | "saved" | "error"
  const skipSave = useRef(false);
  const loadedDate = useRef(null);

  // Nạp form khi có dữ liệu của ngày đang chọn (từ cache thì tức thì).
  useEffect(() => {
    if (loadedDate.current === date) return;
    if (row === undefined) { setData(null); return; } // đang tải ngày mới
    loadedDate.current = date;
    skipSave.current = true;
    setData(row?.data ?? {});
    setStatus(row ? "saved" : "");
  }, [date, row]);

  // Tự động lưu (debounce) khi có chỉnh sửa
  useEffect(() => {
    if (data === null) return;
    if (skipSave.current) { skipSave.current = false; return; }
    setStatus("saving");
    const t = setTimeout(() => {
      api("/api/mood", { method: "PUT", body: JSON.stringify({ date, data }) })
        .then(() => { setStatus("saved"); mutate({ entry_date: date, data }, { revalidate: false }); })
        .catch(() => setStatus("error"));
    }, 700);
    return () => clearTimeout(t);
  }, [data, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = useCallback((key, val) => setData((d) => ({ ...d, [key]: val })), []);
  const setIdx = useCallback((key, i, val) =>
    setData((d) => { const a = [...(d[key] ?? [])]; a[i] = val; return { ...d, [key]: a }; }), []);
  const toggleIn = useCallback((key, val, max) =>
    setData((d) => {
      const cur = d[key] ?? [];
      if (cur.includes(val)) return { ...d, [key]: cur.filter((x) => x !== val) };
      if (max && cur.length >= max) return d;
      return { ...d, [key]: [...cur, val] };
    }), []);

  if (data === null) {
    return (
      <div className="content">
        <div className="skeleton"><div className="line" /><div className="line" /><div className="line" /></div>
      </div>
    );
  }

  const d = data;
  return (
    <div className="content">
      <div className="mood-head">
        <p className="mood-sub">
          Ghi lại tâm trạng, công việc và suy nghĩ mỗi ngày để hiểu bản thân hơn và làm việc hiệu quả hơn.
        </p>
        <div className="mood-actions">
          <span className="mood-status">
            {status === "saving" ? "Đang lưu…" : status === "saved" ? "Đã lưu" : status === "error" ? "Lỗi lưu" : ""}
          </span>
          <label className="mood-date">
            <IconCalendar />
            <input type="date" value={date} max={localToday()} onChange={(e) => setDate(e.target.value || localToday())} />
          </label>
          <button className="mood-new" onClick={() => setDate(localToday())}>
            <IconPlus /> Hôm nay
          </button>
        </div>
      </div>

      <div className="mood-grid">
        {/* 1 */}
        <Card n={1} title="Hôm nay tôi cảm thấy thế nào?">
          <div className="mood-label">Chọn tối đa 3 từ mô tả tâm trạng hôm nay:</div>
          <div className="mood-moods">
            {MOODS.map(([key, emo, label]) => {
              const on = (d.moods ?? []).includes(key);
              return (
                <button key={key} className={`mood-chip ${on ? "on" : ""}`} onClick={() => toggleIn("moods", key, 3)}>
                  <span className="emo">{emo}</span>
                  <span className="cap">{label}</span>
                  <span className="dot" />
                </button>
              );
            })}
          </div>
          <div className="mood-subgrid">
            <div className="mood-subbox">
              <div className="mood-label">⚡ Mức năng lượng (1-10)</div>
              <Scale value={d.energy} onChange={(v) => set("energy", v)} />
            </div>
            <div className="mood-subbox">
              <div className="mood-label">🔥 Mức áp lực (1-10)</div>
              <Scale value={d.pressure} onChange={(v) => set("pressure", v)} />
            </div>
          </div>
        </Card>

        {/* 2 */}
        <Card n={2} title="Hôm nay tôi đã làm được gì?">
          <div className="mood-label">3 việc quan trọng nhất đã hoàn thành:</div>
          {[0, 1, 2].map((i) => (
            <NumInput key={i} n={i + 1} value={(d.done ?? [])[i] ?? ""} onChange={(v) => setIdx("done", i, v)} />
          ))}
          <div className="mood-label">Điều khiến tôi thấy bản thân làm tốt hôm nay:</div>
          <Area value={d.didWell} onChange={(v) => set("didWell", v)} placeholder="Viết điều bạn tự hào về bản thân hôm nay…" />
        </Card>

        {/* 3 */}
        <Card n={3} title="Điều gì làm tôi mệt nhất hôm nay?">
          <div className="mood-label">Việc nào làm tôi căng thẳng nhất?</div>
          <Area value={d.hardest} onChange={(v) => set("hardest", v)} placeholder="Nhập công việc khiến bạn căng thẳng nhất…" />
          <div className="mood-label">Việc đó thuộc nhóm nào?</div>
          <Checks options={HARDEST_CATS} selected={d.hardestCats ?? []} onToggle={(v) => toggleIn("hardestCats", v)} />
        </Card>

        {/* 4 */}
        <Card n={4} title="Điều gì đang làm tôi suy nghĩ?">
          <div className="mood-label">Hiện tại trong đầu tôi đang lo nhất điều gì?</div>
          <Area value={d.thinking} onChange={(v) => set("thinking", v)} rows={5} placeholder="Viết điều bạn đang suy nghĩ, lo lắng…" />
        </Card>

        {/* 5 */}
        <Card n={5} title="Có việc nào tôi đang né tránh không?">
          <div className="mood-label">Việc đó là gì?</div>
          <Input value={d.avoiding} onChange={(v) => set("avoiding", v)} placeholder="Nhập công việc bạn đang né tránh…" />
          <div className="mood-label">Tại sao tôi chưa làm?</div>
          <Area value={d.avoidingWhy} onChange={(v) => set("avoidingWhy", v)} placeholder="Viết lý do bạn chưa làm…" />
        </Card>

        {/* 6 */}
        <Card n={6} title="Điều gì thực sự cần làm vào ngày mai?">
          <div className="mood-label">Chỉ ghi tối đa 3 việc quan trọng nhất:</div>
          {[0, 1, 2].map((i) => (
            <NumInput key={i} n={i + 1} value={(d.tomorrow ?? [])[i] ?? ""} onChange={(v) => setIdx("tomorrow", i, v)} />
          ))}
        </Card>

        {/* 7 */}
        <Card n={7} title="Tôi có cần tự trách mình không?">
          <div className="mood-label">Hôm nay có lỗi nào tôi mắc?</div>
          <Input value={d.mistake} onChange={(v) => set("mistake", v)} placeholder="Nhập lỗi bạn cảm thấy…" />
          <div className="mood-label">Lỗi đó do:</div>
          <Checks options={MISTAKE_CAUSES} selected={d.mistakeCauses ?? []} onToggle={(v) => toggleIn("mistakeCauses", v)} />
          <div className="mood-label">Tôi học được gì từ lỗi này?</div>
          <Area value={d.lesson} onChange={(v) => set("lesson", v)} placeholder="Viết điều bạn rút ra…" />
        </Card>

        {/* 8 */}
        <Card n={8} title="Góc xả não">
          <div className="mood-label">Viết bất cứ điều gì đang nằm trong đầu.</div>
          <Area value={d.braindump} onChange={(v) => set("braindump", v)} rows={4} placeholder="Viết tự do…" />
        </Card>

        {/* 9 */}
        <Card n={9} title="Kết thúc ngày">
          <div className="mood-label">Hôm nay tôi chấm cho mình:</div>
          <Stars value={d.score ?? 0} onChange={(v) => set("score", v)} />
          <div className="mood-label">Điều tôi biết ơn hôm nay:</div>
          <Input value={d.grateful} onChange={(v) => set("grateful", v)} placeholder="Nhập điều bạn biết ơn…" />
          <div className="mood-label">Một câu muốn nhắn với bản thân:</div>
          <Input value={d.noteToSelf} onChange={(v) => set("noteToSelf", v)} placeholder="Nhắn nhủ bản thân một điều…" />
        </Card>

        {/* Câu hỏi đặc biệt */}
        <div className="mood-card full special">
          <div className="mood-ch">
            <span className="mood-badge moon">🌙</span> Câu hỏi đặc biệt dành cho bạn
          </div>
          <div className="mood-label">
            Nếu bây giờ đi ngủ, điều gì sẽ thực sự xảy ra nếu tôi chưa làm hết số việc còn lại?
            <br />
            <i>Giúp phân biệt việc khẩn cấp thật và áp lực giả — nhiều khi mai làm vẫn kịp. ❤️</i>
          </div>
          <Area value={d.sleepAnswer} onChange={(v) => set("sleepAnswer", v)} placeholder="Viết câu trả lời của bạn…" />
        </div>
      </div>
    </div>
  );
}

/* ================= Các thành phần con ================= */
function Card({ n, title, children }) {
  return (
    <div className="mood-card">
      <div className="mood-ch">
        <span className="mood-badge">{n}</span> {title}
      </div>
      {children}
    </div>
  );
}

function Scale({ value, onChange }) {
  return (
    <div className="mood-scale">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          className={`scale-dot ${value === n ? "on" : ""}`}
          onClick={() => onChange(value === n ? null : n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function Stars({ value, onChange }) {
  return (
    <div className="mood-stars">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = value >= i * 2;
        return (
          <button
            key={i}
            className={`star ${filled ? "on" : ""}`}
            onClick={() => onChange(value === i * 2 ? 0 : i * 2)}
            aria-label={`${i * 2}/10`}
          >
            ★
          </button>
        );
      })}
      <span className="star-val">{value || 0}/10</span>
    </div>
  );
}

function Checks({ options, selected, onToggle }) {
  return (
    <div className="mood-checks">
      {options.map((o) => (
        <button key={o} className={`mood-check ${selected.includes(o) ? "on" : ""}`} onClick={() => onToggle(o)}>
          <span className="box" />
          {o}
        </button>
      ))}
    </div>
  );
}

function Input({ value, onChange, placeholder }) {
  return (
    <input className="mood-input" value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  );
}

function NumInput({ n, value, onChange }) {
  return (
    <div className="mood-numrow">
      <span className="mood-num">{n}</span>
      <input className="mood-input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Area({ value, onChange, placeholder, rows = 2 }) {
  const ref = useRef(null);
  const grow = (el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } };
  useEffect(() => { grow(ref.current); }, [value]);
  return (
    <textarea
      ref={ref}
      rows={rows}
      className="mood-area"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => { onChange(e.target.value); grow(e.target); }}
    />
  );
}
