import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PATCH /api/notes/:id  { content?, restore? }
export async function PATCH(req, { params }) {
  const sb = supabaseAdmin();
  const { id } = await params;
  const body = await req.json();

  const patch = {};
  if (body.content !== undefined) {
    patch.content = String(body.content);
    patch.updated_at = new Date().toISOString();
  }
  if (body.restore) patch.deleted_at = null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("notes")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// DELETE /api/notes/:id  -> soft delete (?hard=1 to purge)
export async function DELETE(req, { params }) {
  const sb = supabaseAdmin();
  const { id } = await params;
  const { searchParams } = new URL(req.url);

  if (searchParams.get("hard")) {
    const { error } = await sb.from("notes").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await sb
      .from("notes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
