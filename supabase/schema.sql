-- =====================================================================
--  Ghi chú & Công việc — schema cho Supabase (Postgres)
--  Chạy toàn bộ file này trong: Supabase Dashboard → SQL Editor → New query
-- =====================================================================

-- ---------- Bảng ----------
create table if not exists routines (
  id          bigint generated always as identity primary key,
  title       text not null,
  weekday     int  not null check (weekday between 0 and 6),  -- 0=CN .. 6=T7 (JS getDay)
  due_time    text,                                           -- "HH:MM", null = cả ngày
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists tasks (
  id          bigint generated always as identity primary key,
  title       text not null,
  parent_id   bigint references tasks(id)    on delete cascade,
  routine_id  bigint references routines(id) on delete set null,
  completed   boolean not null default false,
  due_date    date,
  due_time    text,
  rolled_over boolean not null default false,                 -- true = đã bị dời từ ngày trước
  position    int not null default 0,
  deleted_at  timestamptz,                                    -- soft delete -> Thùng rác
  created_at  timestamptz not null default now()
);

create table if not exists notes (
  id          bigint generated always as identity primary key,
  content     text not null,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Index ----------
create index if not exists idx_tasks_parent on tasks(parent_id);
create index if not exists idx_tasks_due    on tasks(due_date);
-- Mỗi việc trong thời khóa biểu chỉ sinh đúng 1 task mỗi ngày
create unique index if not exists idx_tasks_routine_day
  on tasks(routine_id, due_date) where routine_id is not null;

-- ---------- Hàm đồng bộ mỗi ngày ----------
-- 1) Dời các việc tự tạo (không thuộc TKB) chưa hoàn thành sang hôm nay.
-- 2) Sinh task từ thời khóa biểu cho đúng thứ của hôm nay (không trùng nhờ index trên).
create or replace function sync_today(p_today date, p_weekday int)
returns void
language plpgsql
as $$
begin
  update tasks
     set due_date = p_today, rolled_over = true
   where deleted_at is null and completed = false and parent_id is null
     and routine_id is null and due_date is not null and due_date < p_today;

  insert into tasks (title, routine_id, due_date, due_time, position)
  select r.title, r.id, p_today, r.due_time,
         base.maxpos + row_number() over (order by r.position, r.id)
    from routines r
    cross join (
      select coalesce(max(position), -1) as maxpos
        from tasks where parent_id is null
    ) base
   where r.weekday = p_weekday
  on conflict (routine_id, due_date) where routine_id is not null
  do nothing;
end;
$$;

-- ---------- Bảo mật ----------
-- Bật RLS để chặn truy cập ẩn danh. App chạy bằng service_role key phía server,
-- key này luôn bỏ qua RLS nên không cần thêm policy.
alter table routines enable row level security;
alter table tasks    enable row level security;
alter table notes    enable row level security;

-- ---------- Dữ liệu mẫu (tuỳ chọn — xoá nếu không cần) ----------
insert into routines (title, weekday, due_time, position) values
  ('Tập gym', 4, '06:30', 0);  -- Thứ 5

with parent as (
  insert into tasks (title, due_date, due_time, position)
  values ('Làm báo cáo tháng 5', current_date, null, 0)
  returning id
)
insert into tasks (title, parent_id, due_date, due_time, position)
select 'Kiểm tra P&L HVB',     parent.id, current_date, null,    0 from parent
union all
select 'Check tồn kho Sơn Kỳ', parent.id, current_date, null,    1 from parent
union all
select 'Gửi báo cáo cho sếp',  parent.id, current_date, '17:00', 2 from parent;

insert into tasks (title, due_date, due_time, position) values
  ('Họp quản lý tháng 6',          current_date, '14:00', 1),
  ('Kiểm tra khiếu nại khách hàng', current_date, null,   2);

insert into notes (content) values
  ('Chào mừng 👋
Đây là ghi chú đầu tiên của bạn. Chạm vào để sửa, dòng đầu tiên sẽ là tiêu đề.');
