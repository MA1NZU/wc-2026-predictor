import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getCache, setCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

function calculatePoints(
  pred: { homeScore: number; awayScore: number },
  match: { homeScore: number | null; awayScore: number | null }
) {
  if (match.homeScore === null || match.awayScore === null) return 0;
  if (pred.homeScore === match.homeScore && pred.awayScore === match.awayScore) return 6;

  const predOutcome = pred.homeScore > pred.awayScore ? "home" : pred.homeScore < pred.awayScore ? "away" : "draw";
  const actOutcome = match.homeScore > match.awayScore ? "home" : match.homeScore < match.awayScore ? "away" : "draw";

  if (predOutcome === actOutcome) return 3;
  return 0;
}

export async function GET() {
  try {
    const cached = getCache<any>("leaderboard", 60_000);
    if (cached) return NextResponse.json({ leaderboard: cached });

    const [usersSnap, predsSnap, dpSnap, matchesSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("predictions").get(),
      db.collection("doublePicks").get(),
      db.collection("matches").get(),
    ]);

    const matchesMap = new Map<string, any>();
    matchesSnap.docs.forEach((doc) => {
      matchesMap.set(doc.id, { id: doc.id, ...doc.data() } as any);
    });

    const doubleMap = new Map<string, Set<string>>();
    dpSnap.docs.forEach((doc) => {
      const d = doc.data();
      if (!doubleMap.has(d.userId)) doubleMap.set(d.userId, new Set());
      doubleMap.get(d.userId)!.add(d.matchId);
    });

    const userPreds = new Map<string, any[]>();
    predsSnap.docs.forEach((doc) => {
      const d = doc.data();
      if (!userPreds.has(d.userId)) userPreds.set(d.userId, []);
      userPreds.get(d.userId)!.push(d);
    });

    const leaderboard = usersSnap.docs.map((doc) => {
      const data = doc.data();
      let totalPoints = 0;
      const preds = userPreds.get(doc.id) || [];
      const userDoubles = doubleMap.get(doc.id) || new Set<string>();

      for (const pred of preds) {
        const match = matchesMap.get(pred.matchId);
        if (!match) continue;
        const base = calculatePoints(pred, match);
        const isDoubled = userDoubles.has(pred.matchId);
        totalPoints += base * (isDoubled ? 2 : 1);
      }

      return {
        id: doc.id,
        username: data.username,
        totalPoints,
        predictionsCount: preds.length,
      };
    });

    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    setCache("leaderboard", leaderboard, 60_000);
    return NextResponse.json({ leaderboard });
  } catch (err: any) {
    console.error("Leaderboard error:", err?.message || err);
    // Return empty leaderboard so the page doesn't crash
    return NextResponse.json({ leaderboard: [] });
  }
}
