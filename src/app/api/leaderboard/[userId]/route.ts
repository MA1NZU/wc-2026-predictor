import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function calculatePoints(
  pred: { home_score: number; away_score: number },
  match: { home_score: number | null; away_score: number | null }
) {
  if (match.home_score === null || match.away_score === null) return 0;
  if (pred.home_score === match.home_score && pred.away_score === match.away_score) return 6;

  const predOutcome = pred.home_score > pred.away_score ? "home" : pred.home_score < pred.away_score ? "away" : "draw";
  const actOutcome = match.home_score > match.away_score ? "home" : match.home_score < match.away_score ? "away" : "draw";

  if (predOutcome === actOutcome) return 3;
  return 0;
}

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;

    const { data: user } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: predictions } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_id", userId);

    const { data: matches } = await supabase.from("matches").select("*");
    const { data: doublePicks } = await supabase
      .from("double_picks")
      .select("*")
      .eq("user_id", userId);

    const matchesMap = new Map<string, any>();
    (matches || []).forEach((m: any) => matchesMap.set(m.id, m));

    const doubleSet = new Set<string>();
    (doublePicks || []).forEach((d: any) => doubleSet.add(d.match_id));

    const predictionsDetail = (predictions || [])
      .map((pred: any) => {
        const match = matchesMap.get(pred.match_id);
        if (!match) return null;

        const base = calculatePoints(pred, match);
        const isDoubled = doubleSet.has(pred.match_id);
        const points = base * (isDoubled ? 2 : 1);

        return {
          id: pred.id,
          matchId: pred.match_id,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          matchDate: match.match_date,
          homeScore: match.home_score,
          awayScore: match.away_score,
          isLive: match.is_live || false,
          predictedHome: pred.home_score,
          predictedAway: pred.away_score,
          isDoubled,
          basePoints: base,
          points,
          hasScore: match.home_score !== null && match.away_score !== null,
        };
      })
      .filter(Boolean);

    predictionsDetail.sort(
      (a: any, b: any) =>
        new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    );

    let totalPoints = 0;
    predictionsDetail.forEach((p: any) => {
      totalPoints += p.points;
    });

    return NextResponse.json({
      user: { id: user.id, username: user.username },
      totalPoints,
      predictionsCount: predictionsDetail.length,
      predictions: predictionsDetail,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
