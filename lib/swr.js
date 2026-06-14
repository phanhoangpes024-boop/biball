/* Lớp dữ liệu dùng SWR: cache, stale-while-revalidate, optimistic. */
import { api } from "./client";

export const fetcher = (url) => api(url);

const CACHE_KEY = "biball-cache-v1";

/** Cache SWR lưu vào localStorage -> mở app hiện nội dung cũ ngay (Phase 3). */
export function localStorageProvider() {
  if (typeof window === "undefined") return new Map();

  let map;
  try {
    map = new Map(JSON.parse(localStorage.getItem(CACHE_KEY) || "[]"));
  } catch {
    map = new Map();
  }

  const save = () => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(map.entries())));
    } catch {}
  };
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") save();
  });

  return map;
}

/**
 * Cập nhật lạc quan (optimistic) theo pattern chuẩn SWR:
 *  - Đổi giao diện NGAY (optimisticData).
 *  - Gọi API, rồi TỰ fetch lại đổ thẳng vào cache (không dính dedupe).
 *  - Lỗi -> tự hoàn tác (rollbackOnError).
 * @param mutate  hàm mutate gắn với key (từ useSWR)
 * @param key     key SWR để fetch lại dữ liệu thật
 * @param updater (data hiện tại) => data mới
 * @param request () => Promise  gọi API
 * @param after   (tuỳ chọn) chạy sau khi xong, vd revalidate key liên quan
 */
export async function optimistic(mutate, key, updater, request, after) {
  try {
    await mutate(
      async () => {
        await request();
        return fetcher(key); // dữ liệu thật, bỏ qua dedupe
      },
      {
        optimisticData: (cur) => updater(cur),
        populateCache: true,
        revalidate: false,
        rollbackOnError: true,
      }
    );
  } catch {
    // lỗi -> SWR đã tự hoàn tác
  }
  after?.();
}
