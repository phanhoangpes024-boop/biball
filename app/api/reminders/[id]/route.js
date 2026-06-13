import { supabaseAdmin } from "@/lib/supabase";
import { REPEATS } from "@/lib/reminders";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PATCH /api/reminders/:id  { title?, dueDate?, dueTime?, repeat?, priority?, completed?, restore? }
export async function PATCH(req, { params }) {
  const sb = supabaseAdmin();
  const { id } = await params;
  const body = await req.json();

  const patch = {};
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.dueDate !== undefined) patch.due_date = body.dueDate;
  if (body.dueTime !== undefined) patch.due_time = body.dueTime;
  if (body.repeat !== undefined) patch.repeat = REPEATS.includes(body.repeat) ? body.repeat : "none";
  if (body.priority !== undefined) patch.priority = !!body.priority;
  if (body.completed !== undefined) patch.completed = !!body.completed;
  if (body.restore) patch.deleted_at = null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("reminders")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// DELETE /api/reminders/:id  -> soft delete (?hard=1 to purge)
export async function DELETE(req, { params }) {
  const sb = supabaseAdmin();
  const { id } = await params;
  const { searchParams } = new URL(req.url);

  if (searchParams.get("hard")) {
    const { error } = await sb.from("reminders").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await sb
      .from("reminders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
