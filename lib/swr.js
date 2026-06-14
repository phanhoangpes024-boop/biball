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

// Gộp 1 lần đồng bộ lại với server cho mỗi key, sau khi người dùng ngừng thao tác.
// Tránh nhiều lần fetch đua nhau (bấm tick liên tục) ghi đè lẫn nhau.
const reconcileTimers = new Map();
function scheduleReconcile(mutate, key) {
  clearTimeout(reconcileTimers.get(key));
  reconcileTimers.set(
    key,
    setTimeout(() => {
      reconcileTimers.delete(key);
      fetcher(key)
        .then((fresh) => mutate(fresh, { revalidate: false, populateCache: true }))
        .catch(() => {});
    }, 600)
  );
}

/**
 * Cập nhật lạc quan (optimistic), an toàn khi bấm liên tục nhiều cái:
 *  - Đổi cache NGAY bằng updater (GỘP DỒN trên cache hiện tại, không đua).
 *  - Gọi API chạy nền; lỗi thì fetch lại trạng thái thật (hoàn tác).
 *  - Sau khi NGỪNG thao tác mới đồng bộ lại 1 lần (debounce) -> không có
 *    chuyện nhiều fetch trả về lệch thứ tự ghi đè làm mất tick.
 * @param mutate  hàm mutate gắn với key (từ useSWR)
 * @param key     key SWR để fetch lại dữ liệu thật
 * @param updater (data hiện tại) => data mới
 * @param request () => Promise  gọi API
 * @param after   (tuỳ chọn) chạy sau khi xong, vd revalidate key liên quan
 */
export async function optimistic(mutate, key, updater, request, after) {
  // Cập nhật cache bằng HÀM (gộp trên cache hiện tại) — KHÔNG refetch mỗi lần,
  // nên nhiều thao tác liên tiếp không có chuyện fetch trả về lệch thứ tự đè nhau.
  mutate((cur) => updater(cur), { revalidate: false, populateCache: true });
  try {
    await request();
  } catch {
    // lỗi: đồng bộ lại để lấy trạng thái thật
  }
  scheduleReconcile(mutate, key); // đồng bộ thật 1 lần sau khi NGỪNG thao tác
  after?.();
}
