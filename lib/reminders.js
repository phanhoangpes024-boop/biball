/* Server-side helpers cho lời nhắc: tính ngày lặp lại + đồng bộ "nhảy qua Note". */

export const REPEATS = [
  "none", "daily", "weekdays", "weekends", "weekly",
  "biweekly", "monthly", "quarterly", "semiannually", "yearly",
];

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Ngày kế tiếp của một lời nhắc lặp lại; null nếu không lặp. */
export function nextDate(dateStr, repeat) {
  const d = new Date(dateStr + "T00:00:00");
  const addDays = (n) => d.setDate(d.getDate() + n);

  switch (repeat) {
    case "daily": addDays(1); break;
    case "weekly": addDays(7); break;
    case "biweekly": addDays(14); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "semiannually": d.setMonth(d.getMonth() + 6); break;
    case "yearly": d.setFullYear(d.getFullYear() + 1); break;
    case "weekdays": do { addDays(1); } while ([0, 6].includes(d.getDay())); break;
    case "weekends": do { addDays(1); } while (![0, 6].includes(d.getDay())); break;
    default: return null; // "none" hoặc giá trị lạ
  }
  return fmt(d);
}

/**
 * Lời nhắc tới hạn (due_date <= hôm nay) thì "nhảy" sang mục Note (checklist):
 *  - Tạo 1 task (from_reminder = true) ở mục Note để tick như checklist.
 *  - Lời nhắc 1 lần  -> xoá hẳn khỏi danh sách (đã thành task).
 *  - Lời nhắc lặp lại -> dời due_date sang lần kế tiếp (> hôm nay).
 * Hàm idempotent: chạy lại trong ngày không tạo trùng.
 */
export async function syncReminders(sb, today) {
  const { data: due, error } = await sb
    .from("reminders")
    .select("*")
    .is("deleted_at", null)
    .eq("completed", false)
    .not("due_date", "is", null)
    .lte("due_date", today)
    .order("id", { ascending: true });
  if (error || !due?.length) return;

  // Vị trí kế tiếp trong danh sách việc cha.
  const { data: posRows } = await sb
    .from("tasks")
    .select("position")
    .is("parent_id", null)
    .order("position", { ascending: false })
    .limit(1);
  let position = (posRows?.[0]?.position ?? -1) + 1;

  const insertTask = (r, dueDate) =>
    sb.from("tasks").insert({
      title: r.title,
      due_date: dueDate, // giữ NGÀY THẬT của lần lời nhắc
      from_reminder: true,
      position: position++,
    });

  for (const r of due) {
    if (r.repeat === "none") {
      // 1 lần: tới NGÀY (hoặc quá hạn) -> nhảy rồi xoá khỏi danh sách.
      // CLAIM: xoá lời nhắc trước — chỉ 1 lần đồng bộ xoá được (tránh tạo trùng).
      const { data: claimed } = await sb.from("reminders").delete().eq("id", r.id).select("id");
      if (!claimed?.length) continue;
      await insertTask(r, r.due_date);
    } else {
      // Lặp lại: bỏ qua các lần ĐÃ LỠ trong quá khứ (dời tới lần >= hôm nay).
      let d = r.due_date;
      let guard = 0;
      while (d < today && guard++ < 1000) d = nextDate(d, r.repeat);

      if (d === today) {
        // CLAIM: dời ngày CÓ ĐIỀU KIỆN (chỉ khi due_date chưa bị đổi) rồi mới nhảy.
        const { data: claimed } = await sb
          .from("reminders")
          .update({ due_date: nextDate(d, r.repeat) })
          .eq("id", r.id)
          .eq("due_date", r.due_date)
          .select("id");
        if (!claimed?.length) continue; // lần đồng bộ khác đã xử lý
        await insertTask(r, d);
      } else if (d !== r.due_date) {
        // chỉ dời ngày cho đúng (đã bỏ lần lỡ)
        await sb.from("reminders").update({ due_date: d }).eq("id", r.id).eq("due_date", r.due_date);
      }
    }
  }
}
