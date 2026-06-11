import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("routines")
    .select("*")
    .order("weekday", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true })
    .order("id", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/routines  { title, weekday, dueTime? }
export async function POST(req) {
  const sb = supabaseAdmin();
  const body = await req.json();
  const title = (body.title || "").trim();
  const weekday = Number(body.weekday);
  if (!title || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return NextResponse.json({ error: "title and weekday (0-6) required" }, { status: 400 });
  }

  const { data: posRows } = await sb
    .from("routines")
    .select("position")
    .eq("weekday", weekday)
    .order("position", { ascending: false })
    .limit(1);
  const position = (posRows?.[0]?.position ?? -1) + 1;

  const { data, error } = await sb
    .from("routines")
    .insert({ title, weekday, due_time: body.dueTime ?? null, position })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
