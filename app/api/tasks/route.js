import { supabaseAdmin, localToday } from "@/lib/supabase";
import { syncReminders } from "@/lib/reminders";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/tasks?view=today|history|trash
export async function GET(req) {
  const sb = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "today";

  // Lời nhắc tới hạn (theo NGÀY, giờ VN) tự "nhảy" thành mục checklist.
  // Chỉ chạy ở view=today để tránh 2 lần đồng bộ song song tạo task trùng.
  if (view === "today") await syncReminders(sb, localToday());

  // Lịch sử làm việc: đếm theo "đơn vị việc" (leaf):
  //  - việc KHÔNG có việc con = 1 đơn vị; việc CÓ việc con -> mỗi việc con là 1 đơn vị.
  // Trả về các đơn vị đã HOÀN THÀNH và TẠM HOÃN (kèm tên việc mẹ + lý do hoãn).
  if (view === "history") {
    const { data: all, error } = await sb
      .from("tasks")
      .select("id,title,parent_id,completed,completed_at,on_hold,hold_note,held_at")
      .is("deleted_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const parentIds = new Set(all.filter((t) => t.parent_id != null).map((t) => t.parent_id));
    const titleById = new Map(all.map((t) => [t.id, t.title]));
    const leaves = all.filter((t) => !parentIds.has(t.id));
    const base = (t) => ({
      id: t.id,
      title: t.title,
      parent_id: t.parent_id,
      parent_title: t.parent_id != null ? titleById.get(t.parent_id) ?? null : null,
    });

    const items = [
      ...leaves
        .filter((t) => t.completed && t.completed_at && !t.on_hold)
        .map((t) => ({ ...base(t), type: "done", at: t.completed_at, note: null })),
      ...leaves
        .filter((t) => t.on_hold && t.held_at)
        .map((t) => ({ ...base(t), type: "hold", at: t.held_at, note: t.hold_note })),
    ].sort((a, b) => (a.at < b.at ? 1 : -1));

    return NextResponse.json(items);
  }

  let q = sb.from("tasks").select("*").is("parent_id", null);
  if (view === "trash") {
    q = q.not("deleted_at", "is", null);
  } else {
    // Note = việc đang làm (chưa xong, chưa tạm hoãn). Xong/hoãn -> Lịch sử làm việc.
    q = q.is("deleted_at", null).eq("completed", false).eq("on_hold", false);
  }

  const { data: parents, error } = await q
    .order("position", { ascending: true })
    .order("id", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = parents.map((t) => t.id);
  const byParent = {};
  if (ids.length) {
    const { data: kids, error: kErr } = await sb
      .from("tasks")
      .select("*")
      .in("parent_id", ids)
      .is("deleted_at", null)
      .eq("on_hold", false) // việc con tạm hoãn -> ẩn khỏi Note
      .order("position", { ascending: true })
      .order("id", { ascending: true });
    if (kErr) return NextResponse.json({ error: kErr.message }, { status: 500 });
    for (const k of kids) (byParent[k.parent_id] ??= []).push(k);
  }

  const result = parents.map((t) => ({ ...t, children: byParent[t.id] ?? [] }));
  return NextResponse.json(result);
}

// POST /api/tasks  { title, parentId?, dueDate?, dueTime? }
export async function POST(req) {
  const sb = supabaseAdmin();
  const body = await req.json();
  const title = (body.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const parentId = body.parentId ?? null;
  // Việc trong Note là checklist — không tự gắn ngày, để người dùng tự đặt nếu cần.
  const dueDate = body.dueDate !== undefined ? body.dueDate : null;
  const dueTime = body.dueTime ?? null;

  // Next position within the same level.
  let posQ = sb.from("tasks").select("position").order("position", { ascending: false }).limit(1);
  posQ = parentId == null ? posQ.is("parent_id", null) : posQ.eq("parent_id", parentId);
  const { data: posRows } = await posQ;
  const position = (posRows?.[0]?.position ?? -1) + 1;

  const { data, error } = await sb
    .from("tasks")
    .insert({ title, parent_id: parentId, due_date: dueDate, due_time: dueTime, position })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
