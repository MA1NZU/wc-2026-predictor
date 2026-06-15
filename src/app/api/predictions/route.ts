import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { matchId, homeScore, awayScore } = await req.json();

    if (homeScore === undefined || awayScore === undefined || !matchId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { data: match } = await supabase
      .from("matches")
      .select("*, rounds!inner(status)")
      .eq("id", matchId)
      .single();

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (match.is_live || match.rounds.status === "LIVE" || match.rounds.status === "FINISHED") {
      return NextResponse.json({ error: "Predictions are locked for this match" }, { status: 403 });
    }

    const { data: prediction, error } = await supabase
      .from("predictions")
      .upsert(
        {
          user_id: user.userId,
          match_id: matchId,
          home_score: Number(homeScore),
          away_score: Number(awayScore),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,match_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to save prediction" }, { status: 500 });
    }

    return NextResponse.json({ prediction });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
