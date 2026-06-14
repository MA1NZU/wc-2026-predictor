import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { matchId, roundId } = await req.json();

    const { data: match } = await supabase
      .from("matches")
      .select("*, rounds!inner(status)")
      .eq("id", matchId)
      .single();

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (match.is_live || match.rounds.status === "LIVE" || match.rounds.status === "FINISHED") {
      return NextResponse.json({ error: "Round is locked" }, { status: 403 });
    }

    await supabase
      .from("double_picks")
      .delete()
      .eq("user_id", user.userId)
      .eq("round_id", roundId);

    const { data: doublePick, error } = await supabase
      .from("double_picks")
      .insert({ user_id: user.userId, round_id: roundId, match_id: matchId })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to set double pick" }, { status: 500 });
    }

    return NextResponse.json({ doublePick });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
