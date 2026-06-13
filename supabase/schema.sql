-- =====================================================================
--  Note (checklist) & Lời nhắc — schema cho Supabase (Postgres)
--  Chạy toàn bộ file này trong: Supabase Dashboard → SQL Editor → New query
--  (Chạy lại nhiều lần được — mọi lệnh đều idempotent.)
-- =====================================================================

-- ---------- Lời nhắc (giống app Lời nhắc của iPhone) ----------
create table if not exists reminders (
  id          bigint generated always as identity primary key,
  title       text    not null,
  due_date    date,                                   -- null = chưa đặt ngày
  due_time    text,                                   -- "HH:MM", null = cả ngày
  repeat      text    not null default 'none',        -- none|daily|weekdays|weekends|weekly|biweekly|monthly|quarterly|semiannually|yearly
  priority    boolean not null default false,         -- bật => hiện "!!!"
  completed   boolean not null default false,
  position    int     not null default 0,
  deleted_at  timestamptz,                            -- soft delete -> Thùng rác
  created_at  timestamptz not null default now()
);
create index if not exists idx_reminders_due on reminders(due_date);

-- ---------- Note: checklist + việc con ----------
create table if not exists tasks (
  id            bigint generated always as identity primary key,
  title         text    not null,
  parent_id     bigint  references tasks(id) on delete cascade,  -- null = việc cha
  completed     boolean not null default false,
  due_date      date,
  due_time      text,
  from_reminder boolean not null default false,       -- true = nhảy từ Lời nhắc qua
  position      int     not null default 0,
  deleted_at    timestamptz,                          -- soft delete -> Thùng rác
  created_at    timestamptz not null default now()
);
-- Nếu bảng tasks đã có từ trước thì bổ sung cột from_reminder:
alter table tasks add column if not exists from_reminder boolean not null default false;

create index if not exists idx_tasks_parent on tasks(parent_id);
create index if not exists idx_tasks_due    on tasks(due_date);

-- ---------- Bảo mật ----------
-- Bật RLS để chặn truy cập ẩn danh. App chạy bằng service_role key phía server,
-- key này luôn bỏ qua RLS nên không cần thêm policy.
alter table reminders enable row level security;
alter table tasks     enable row level security;

-- ---------- Dữ liệu mẫu (tuỳ chọn — xoá nếu không cần) ----------
insert into reminders (title, due_date, due_time, repeat, priority, position) values
  ('Thứ 2 cầm phễu đi họp luôn', current_date + 2, '10:00', 'none',    true,  0),
  ('Nộp thuế VAT',               current_date + 2, '10:00', 'monthly', false, 1);

with parent as (
  insert into tasks (title, position) values ('Việc cần làm hôm nay', 0)
  returning id
)
insert into tasks (title, parent_id, position)
select 'Kiểm tra tồn kho', parent.id, 0 from parent
union all
select 'Gửi báo cáo',      parent.id, 1 from parent;

-- =====================================================================
--  (Tuỳ chọn) Dọn các bảng cũ không còn dùng của phiên bản trước.
-- =====================================================================
-- drop table if exists notes;
-- drop table if exists routines;
