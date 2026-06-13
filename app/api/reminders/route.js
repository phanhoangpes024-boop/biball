import { supabaseAdmin } from "@/lib/supabase";
import { REPEATS } from "@/lib/reminders";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/reminders?view=trash
export async function GET(req) {
  const sb = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const trash = searchParams.get("view") === "trash";

  let q = sb.from("reminders").select("*");
  q = trash ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);

  const { data, error } = await q
    .order("completed", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("due_time", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true })
    .order("id", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST /api/reminders  { title, dueDate?, dueTime?, repeat?, priority? }
export async function POST(req) {
  const sb = supabaseAdmin();
  const body = await req.json();
  const title = (body.title || "").trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const { data: posRows } = await sb
    .from("reminders")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  const position = (posRows?.[0]?.position ?? -1) + 1;

  const repeat = REPEATS.includes(body.repeat) ? body.repeat : "none";

  const { data, error } = await sb
    .from("reminders")
    .insert({
      title,
      due_date: body.dueDate ?? null,
      due_time: body.dueTime ?? null,
      repeat,
      priority: !!body.priority,
      position,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
