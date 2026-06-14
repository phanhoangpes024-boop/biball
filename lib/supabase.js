import { createClient } from "@supabase/supabase-js";

// Lazily created so `next build` doesn't fail when env vars aren't set yet.
let client;

/** Server-side Supabase client using the service_role key (bypasses RLS). */
export function supabaseAdmin() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local"
      );
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

const VN_TZ = "Asia/Ho_Chi_Minh";

/** yyyy-mm-dd theo giờ Việt Nam (đúng cả khi server chạy UTC như Vercel). */
export function localToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

/** "HH:MM" theo giờ Việt Nam. */
export function vnTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: VN_TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());
}
