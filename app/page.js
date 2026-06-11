"use client";

import { useState } from "react";
import {
  IconLogo, IconSun, IconNote, IconTrash,
  IconChevron, IconMenu, IconTimetable,
} from "@/components/Icons";
import TasksView from "@/components/TasksView";
import NotesView from "@/components/NotesView";
import TrashView from "@/components/TrashView";
import ScheduleView from "@/components/ScheduleView";

const NAV = [
  { key: "today", label: "Hôm nay", Icon: IconSun },
  { key: "schedule", label: "Thời khóa biểu", Icon: IconTimetable },
  { key: "notes", label: "Ghi chú", Icon: IconNote },
  { key: "trash", label: "Thùng rác", Icon: IconTrash },
];

export default function Page() {
  const [view, setView] = useState({ type: "today", label: "Hôm nay" });
  const [drawer, setDrawer] = useState(false);

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

        {view.type === "notes" ? (
          <NotesView />
        ) : view.type === "trash" ? (
          <TrashView />
        ) : view.type === "schedule" ? (
          <ScheduleView />
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
      <div className="brand"><IconLogo /> Ghi chú &amp; Công việc</div>

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

      <div className="sidebar-footer">Dữ liệu lưu cục bộ bằng SQLite</div>
    </aside>
  );
}
