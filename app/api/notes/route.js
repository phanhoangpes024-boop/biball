import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/notes?view=trash
export async function GET(req) {
  const sb = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const trash = searchParams.get("view") === "trash";

  let q = sb.from("notes").select("*");
  q = trash ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);

  const { data, error } = await q
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST /api/notes  { content }
export async function POST(req) {
  const sb = supabaseAdmin();
  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("notes")
    .insert({ content: content.trim() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
