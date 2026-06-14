import { supabaseAdmin, localToday } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/mood?date=YYYY-MM-DD  -> nhật ký của ngày đó (hoặc null)
export async function GET(req) {
  const sb = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || localToday();

  const { data, error } = await sb
    .from("mood_entries")
    .select("*")
    .eq("entry_date", date)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? null);
}

// PUT /api/mood  { date, data }  -> upsert theo ngày
export async function PUT(req) {
  const sb = supabaseAdmin();
  const body = await req.json();
  const date = body.date || localToday();
  const data = body.data ?? {};

  const { data: row, error } = await sb
    .from("mood_entries")
    .upsert(
      { entry_date: date, data, updated_at: new Date().toISOString() },
      { onConflict: "entry_date" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(row);
}
