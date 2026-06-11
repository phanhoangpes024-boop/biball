# Ghi chú & Công việc

Ứng dụng ghi chú và quản lý công việc — Next.js (App Router) + Supabase (Postgres), cài được trên điện thoại dưới dạng PWA.

## Tính năng
- Công việc theo ngày, công việc con (checklist), đánh dấu hoàn thành
- **Thời khóa biểu** cố định theo tuần — tự sinh task vào "Hôm nay" đúng thứ
- Việc tự tạo chưa xong **tự dời sang ngày kế tiếp** đến khi tick
- Ghi chú dạng thẻ, Thùng rác khôi phục được
- PWA + dark mode, giao diện responsive

## Chạy local
```bash
npm install
cp .env.example .env.local   # rồi điền 2 giá trị bên dưới
npm run dev
```

### Biến môi trường (`.env.local`)
| Biến | Lấy ở |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Settings → Data API → **Project URL** (chỉ URL gốc, KHÔNG có đuôi `/rest/v1/`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API Keys → `service_role` secret (key bí mật, chỉ dùng phía server) |

### Tạo database
Mở Supabase → SQL Editor → chạy toàn bộ [`supabase/schema.sql`](supabase/schema.sql).

## Deploy (Vercel)
1. Import repo vào Vercel (tự nhận diện Next.js).
2. Trong **Project Settings → Environment Variables**, thêm `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` (giống `.env.local`).
3. Deploy.

> Yêu cầu Node ≥ 20 (đã khai báo trong `package.json` → `engines`).

## Tech
- Next.js 15 (App Router, Route Handlers làm API)
- React 19
- Supabase JS (`service_role` phía server, RLS bật để chặn truy cập ẩn danh)
