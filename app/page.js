"use client";

import { useEffect, useState } from "react";
import {
  IconNote, IconTrash,
  IconChevron, IconMenu, IconBell, IconHistory, IconHeart,
} from "@/components/Icons";
import TasksView from "@/components/TasksView";
import TrashView from "@/components/TrashView";
import RemindersView from "@/components/RemindersView";
import HistoryView from "@/components/HistoryView";
import MoodView from "@/components/MoodView";

const NAV = [
  { key: "notes", label: "Note", Icon: IconNote },
  { key: "reminders", label: "Lời nhắc", Icon: IconBell },
  { key: "history", label: "Lịch sử làm việc", Icon: IconHistory },
  { key: "mood", label: "Nhật ký tâm trạng", Icon: IconHeart },
  { key: "trash", label: "Thùng rác", Icon: IconTrash },
];

export default function Page() {
  const [view, setView] = useState({ type: "notes", label: "Note" });
  const [drawer, setDrawer] = useState(false);
  // Chỉ render nội dung sau khi mount -> lần render đầu ở client khớp server,
  // tránh lỗi hydration (SWR đọc cache localStorage ngay từ render đầu).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const selectView = (v) => {
    setView(v);
    setDrawer(false);
  };

  return (
    <div className="app">
      <div className={`scrim ${drawer ? "show" : ""}`} onClick={() => setDrawer(false)} />

      <Sidebar view={view} open={drawer} onSelect={selectView} />

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setDrawer(true)} aria-label="Menu">
            <IconMenu />
          </button>
          <h1 className="title">
            <span className="txt">{view.label}</span>
            <span style={{ color: "var(--text-muted)", display: "flex" }}><IconChevron /></span>
          </h1>
        </header>

        {!mounted ? (
          <div className="content">
            <div className="skeleton"><div className="line" /><div className="line" /><div className="line" /></div>
          </div>
        ) : view.type === "reminders" ? (
          <RemindersView />
        ) : view.type === "history" ? (
          <HistoryView />
        ) : view.type === "mood" ? (
          <MoodView />
        ) : view.type === "trash" ? (
          <TrashView />
        ) : (
          <TasksView />
        )}
      </main>
    </div>
  );
}

/* ================= Sidebar ================= */
function Sidebar({ view, open, onSelect }) {
  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand">
        <img className="brand-logo" src="/logo.png" alt="Logo" width={26} height={26} />
        Note &amp; Lời nhắc
      </div>

      <nav className="nav">
        {NAV.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`nav-item ${view.type === key ? "active" : ""}`}
            onClick={() => onSelect({ type: key, label })}
          >
            <span className="icon"><Icon /></span>
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">Note &amp; Lời nhắc</div>
    </aside>
  );
}
