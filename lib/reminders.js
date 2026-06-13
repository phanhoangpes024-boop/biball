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

  for (const r of due) {
    await sb.from("tasks").insert({
      title: r.title,
      due_date: today,
      due_time: r.due_time,
      from_reminder: true,
      position: position++,
    });

    if (r.repeat === "none") {
      await sb.from("reminders").delete().eq("id", r.id);
    } else {
      let nd = nextDate(r.due_date, r.repeat);
      // Nhảy qua mọi lần đã lỡ, dừng ở lần kế tiếp trong tương lai.
      let guard = 0;
      while (nd && nd <= today && guard++ < 1000) nd = nextDate(nd, r.repeat);
      await sb.from("reminders").update({ due_date: nd }).eq("id", r.id);
    }
  }
}
