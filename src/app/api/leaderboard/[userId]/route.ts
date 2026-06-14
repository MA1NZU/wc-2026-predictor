import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

function calculatePoints(
  pred: { homeScore: number; awayScore: number },
  match: { homeScore: number | null; awayScore: number | null }
) {
  if (match.homeScore === null || match.awayScore === null) return null;
  if (pred.homeScore === match.homeScore && pred.awayScore === match.awayScore) return 6;

  const predOutcome = pred.homeScore > pred.awayScore ? "home" : pred.homeScore < pred.awayScore ? "away" : "draw";
  const actOutcome = match.homeScore > match.awayScore ? "home" : match.homeScore < match.awayScore ? "away" : "draw";

  if (predOutcome === actOutcome) return 3;
  return 0;
}

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;

  const [userSnap, predsSnap, matchesSnap, dpSnap] = await Promise.all([
    db.collection("users").doc(userId).get(),
    db.collection("predictions").where("userId", "==", userId).get(),
    db.collection("matches").get(),
    db.collection("doublePicks").where("userId", "==", userId).get(),
  ]);

  if (!userSnap.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userData = userSnap.data()!;

  const matchesMap = new Map<string, any>();
  matchesSnap.docs.forEach((doc) => {
    matchesMap.set(doc.id, { id: doc.id, ...doc.data() });
  });

  const doubleSet = new Set<string>();
  dpSnap.docs.forEach((doc) => {
    doubleSet.add(doc.data().matchId);
  });

  const predictions = predsSnap.docs.map((doc) => {
    const d = doc.data();
    const match = matchesMap.get(d.matchId);
    if (!match) return null;

    const base = calculatePoints(d, match);
    const isDoubled = doubleSet.has(d.matchId);
    const points = base !== null ? base * (isDoubled ? 2 : 1) : null;

    return {
      id: doc.id,
      matchId: d.matchId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      matchDate: match.matchDate,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      isLive: match.isLive || false,
      predictedHome: d.homeScore,
      predictedAway: d.awayScore,
      isDoubled,
      basePoints: base,
      points,
      hasScore: match.homeScore !== null && match.awayScore !== null,
    };
  }).filter(Boolean);

  // Sort by match date
  predictions.sort((a: any, b: any) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

  let totalPoints = 0;
  predictions.forEach((p: any) => {
    if (p.points !== null) totalPoints += p.points;
  });

  return NextResponse.json({
    user: { id: userSnap.id, username: userData.username },
    totalPoints,
    predictionsCount: predictions.length,
    predictions,
  });
}
