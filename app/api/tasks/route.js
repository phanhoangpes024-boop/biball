import { supabaseAdmin, localToday } from "@/lib/supabase";
import { syncReminders } from "@/lib/reminders";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/tasks?view=today|history|trash
export async function GET(req) {
  const sb = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "today";

  // Lời nhắc tới hạn tự "nhảy" thành mục checklist trước khi đọc danh sách.
  if (view === "today" || view === "history") await syncReminders(sb, localToday());

  // Lịch sử làm việc: mọi việc đã tick xong, mới nhất trước, kèm thời điểm tick.
  if (view === "history") {
    const { data, error } = await sb
      .from("tasks")
      .select("*")
      .is("deleted_at", null)
      .eq("completed", true)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .order("id", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  let q = sb.from("tasks").select("*").is("parent_id", null);
  if (view === "trash") {
    q = q.not("deleted_at", "is", null);
  } else {
    // Note = checklist các việc chưa xong (việc xong nhảy sang Lịch sử làm việc).
    q = q.is("deleted_at", null).eq("completed", false);
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
