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

    // 1. Fetch all collections from Firestore
    const usersSnap = await db.collection("users").get();
    const predictionsSnap = await db.collection("predictions").get();
    const doublePicksSnap = await db.collection("double_picks").get();
    const matchesSnap = await db.collection("matches").get();

    // 2. Convert snapshots to arrays
    const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
    const predictions = predictionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
    const doublePicks = doublePicksSnap.docs.map((doc) => doc.data() as any);
    const matches = matchesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

    // 3. Build Maps
    const matchesMap = new Map<string, any>();
    matches.forEach((m) => matchesMap.set(m.id, m));

    const doubleMap = new Map<string, Set<string>>();
    doublePicks.forEach((d) => {
      if (!doubleMap.has(d.user_id)) doubleMap.set(d.user_id, new Set());
      doubleMap.get(d.user_id)!.add(d.match_id);
    });

    const userPreds = new Map<string, any[]>();
    predictions.forEach((p) => {
      if (!userPreds.has(p.user_id)) userPreds.set(p.user_id, []);
      userPreds.get(p.user_id)!.push(p);
    });

    // 4. Calculate Leaderboard
    const leaderboard = users.map((user) => {
      let totalPoints = 0;
      const preds = userPreds.get(user.id) || [];
      const userDoubles = doubleMap.get(user.id) || new Set<string>();

      preds.forEach((pred) => {
        const match = matchesMap.get(pred.match_id);
        if (!match) return;

        const base = calculatePoints(pred, match);
        const isDoubled = userDoubles.has(pred.match_id);
        totalPoints += base * (isDoubled ? 2 : 1);
      });

      return {
        id: user.id,
        username: user.username,
        totalPoints,
        predictionsCount: preds.length,
      };
    });

    // 5. Sort and Cache
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
    setCache("leaderboard", leaderboard, 60_000);

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ leaderboard: [] });
  }
}
