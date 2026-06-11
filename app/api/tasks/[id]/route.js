import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PATCH /api/tasks/:id  { title?, completed?, dueDate?, dueTime?, restore? }
export async function PATCH(req, { params }) {
  const sb = supabaseAdmin();
  const { id } = await params;
  const body = await req.json();

  const patch = {};
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.completed !== undefined) patch.completed = !!body.completed;
  if (body.dueDate !== undefined) patch.due_date = body.dueDate;
  if (body.dueTime !== undefined) patch.due_time = body.dueTime;
  if (body.restore) patch.deleted_at = null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields" }, { status: 400 });
  }

  // Toggle subtasks along with the parent.
  if (body.completed !== undefined) {
    await sb.from("tasks").update({ completed: !!body.completed }).eq("parent_id", id);
  }
  // Bring subtasks back with their parent.
  if (body.restore) {
    await sb.from("tasks").update({ deleted_at: null }).eq("parent_id", id);
  }

  const { data, error } = await sb
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// DELETE /api/tasks/:id   -> soft delete (?hard=1 to purge). Also affects subtasks.
export async function DELETE(req, { params }) {
  const sb = supabaseAdmin();
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const filter = `id.eq.${id},parent_id.eq.${id}`;

  if (searchParams.get("hard")) {
    const { error } = await sb.from("tasks").delete().or(filter);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await sb
      .from("tasks")
      .update({ deleted_at: new Date().toISOString() })
      .or(filter);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
