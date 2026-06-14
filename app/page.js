"use client";

import { useState } from "react";
import {
  IconNote, IconTrash,
  IconChevron, IconMenu, IconBell, IconHistory,
} from "@/components/Icons";
import TasksView from "@/components/TasksView";
import TrashView from "@/components/TrashView";
import RemindersView from "@/components/RemindersView";
import HistoryView from "@/components/HistoryView";

const NAV = [
  { key: "notes", label: "Note", Icon: IconNote },
  { key: "reminders", label: "Lời nhắc", Icon: IconBell },
  { key: "history", label: "Lịch sử làm việc", Icon: IconHistory },
  { key: "trash", label: "Thùng rác", Icon: IconTrash },
];

export default function Page() {
  const [view, setView] = useState({ type: "notes", label: "Note" });
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

        {view.type === "reminders" ? (
          <RemindersView />
        ) : view.type === "history" ? (
          <HistoryView />
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
