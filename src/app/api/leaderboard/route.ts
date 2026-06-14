import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

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
  const [usersSnap, predsSnap, dpSnap, matchesSnap] = await Promise.all([
    db.collection("users").get(),
    db.collection("predictions").get(),
    db.collection("doublePicks").get(),
    db.collection("matches").get(),
  ]);

  const matchesMap = new Map<string, any>();
  matchesSnap.docs.forEach((doc) => {
    matchesMap.set(doc.id, { id: doc.id, ...doc.data() });
  });

  const doubleMap = new Set<string>();
  dpSnap.docs.forEach((doc) => {
    const d = doc.data();
    doubleMap.add(`${d.userId}_${d.matchId}`);
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

    for (const pred of preds) {
      const match = matchesMap.get(pred.matchId);
      if (!match) continue;
      const base = calculatePoints(pred, match);
      const isDoubled = doubleMap.has(`${doc.id}_${pred.matchId}`);
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

  return NextResponse.json({ leaderboard });
}
