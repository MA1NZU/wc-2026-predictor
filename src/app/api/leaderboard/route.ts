import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getCache, setCache } from "@/lib/cache";

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

export async function GET() {
  try {
    const cached = getCache<any>("leaderboard", 60_000);
    if (cached) return NextResponse.json({ leaderboard: cached });

    const { data: users } = await supabase.from("users").select("id, username");
    const { data: predictions } = await supabase.from("predictions").select("*");
    const { data: doublePicks } = await supabase.from("double_picks").select("*");
    const { data: matches } = await supabase.from("matches").select("*");

    const matchesMap = new Map<string, any>();
    (matches || []).forEach((m: any) => matchesMap.set(m.id, m));

    const doubleMap = new Map<string, Set<string>>();
    (doublePicks || []).forEach((d: any) => {
      if (!doubleMap.has(d.user_id)) doubleMap.set(d.user_id, new Set());
      doubleMap.get(d.user_id)!.add(d.match_id);
    });

    const userPreds = new Map<string, any[]>();
    (predictions || []).forEach((p: any) => {
      if (!userPreds.has(p.user_id)) userPreds.set(p.user_id, []);
      userPreds.get(p.user_id)!.push(p);
    });

    const leaderboard = (users || []).map((user: any) => {
      let totalPoints = 0;
      const preds = userPreds.get(user.id) || [];
      const userDoubles = doubleMap.get(user.id) || new Set<string>();

      for (const pred of preds) {
        const match = matchesMap.get(pred.match_id);
        if (!match) continue;
        const base = calculatePoints(pred, match);
        const isDoubled = userDoubles.has(pred.match_id);
        totalPoints += base * (isDoubled ? 2 : 1);
      }

      return {
        id: user.id,
        username: user.username,
        totalPoints,
        predictionsCount: preds.length,
      };
    });

    leaderboard.sort((a: any, b: any) => b.totalPoints - a.totalPoints);

    setCache("leaderboard", leaderboard, 60_000);
    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ leaderboard: [] });
  }
}
