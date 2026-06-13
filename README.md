# Ghi chú & Công việc

Ứng dụng ghi chú và quản lý công việc — Next.js (App Router) + Supabase (Postgres), cài được trên điện thoại dưới dạng PWA.

## Tính năng
- **Lời nhắc** kiểu iPhone: danh sách phẳng, đặt **Ngày / Giờ / Lặp lại / Mức ưu tiên** trong bảng chi tiết; bật ưu tiên hiện `!!!`
- Lời nhắc **tới ngày tự "nhảy"** sang mục **Note** (loại 1 lần biến mất khỏi danh sách; loại lặp tự dời sang lần kế)
- **Note** chia 2 phần: *Từ lời nhắc* (tới hạn) và *Ghi chú* tự viết
- Tên/ghi chú **xuống dòng hiện đầy đủ**, Thùng rác khôi phục được
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
