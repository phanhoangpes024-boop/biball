import { supabaseAdmin, localToday } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PATCH /api/routines/:id  { title?, dueTime?, weekday? }
export async function PATCH(req, { params }) {
  const sb = supabaseAdmin();
  const { id } = await params;
  const body = await req.json();

  const patch = {};
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.dueTime !== undefined) patch.due_time = body.dueTime;
  if (body.weekday !== undefined) patch.weekday = Number(body.weekday);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields" }, { status: 400 });
  }

  const { data: routine, error } = await sb
    .from("routines")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Keep today's not-yet-done instance in sync with the edit.
  await sb
    .from("tasks")
    .update({ title: routine.title, due_time: routine.due_time })
    .eq("routine_id", id)
    .eq("due_date", localToday())
    .eq("completed", false)
    .is("deleted_at", null);

  return NextResponse.json(routine);
}

// DELETE /api/routines/:id — removes the routine + today's unfinished instance.
// Completed instances stay as history (routine_id becomes NULL via FK).
export async function DELETE(req, { params }) {
  const sb = supabaseAdmin();
  const { id } = await params;

  await sb
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("routine_id", id)
    .eq("completed", false)
    .is("deleted_at", null);

  const { error } = await sb.from("routines").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
