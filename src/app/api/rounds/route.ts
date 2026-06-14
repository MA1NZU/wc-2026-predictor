import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";

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

export async function GET() {
  const user = await getUser();

  const roundsSnap = await db.collection("rounds").orderBy("order", "asc").get();
  const matchesSnap = await db.collection("matches").orderBy("order", "asc").get();

  const matchesMap = new Map<string, any>();
  matchesSnap.docs.forEach((doc) => {
    matchesMap.set(doc.id, { id: doc.id, ...doc.data() });
  });

  const predictionsMap = new Map<string, any>();
  const doublePicksSet = new Set<string>();

  if (user) {
    const predsSnap = await db.collection("predictions").where("userId", "==", user.userId).get();
    predsSnap.docs.forEach((doc) => {
      const d = doc.data();
      predictionsMap.set(d.matchId, d);
    });

    const dpSnap = await db.collection("doublePicks").where("userId", "==", user.userId).get();
    dpSnap.docs.forEach((doc) => {
      doublePicksSet.add(doc.data().matchId);
    });
  }

  const rounds = roundsSnap.docs.map((doc) => {
    const roundData = doc.data();
    const roundMatches = Array.from(matchesMap.values()).filter((m) => m.roundId === doc.id);

    return {
      id: doc.id,
      name: roundData.name,
      status: roundData.status,
      order: roundData.order || 0,
      matches: roundMatches.map((match) => {
        const pred = predictionsMap.get(match.id) || null;
        const double = doublePicksSet.has(match.id);
        const basePoints = pred ? calculatePoints(pred, match) : null;
        const points = basePoints !== null ? (double ? basePoints * 2 : basePoints) : null;

        return {
          id: match.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          matchDate: match.matchDate,
          homeScore: match.homeScore ?? null,
          awayScore: match.awayScore ?? null,
          prediction: pred ? { homeScore: pred.homeScore, awayScore: pred.awayScore } : null,
          doublePick: double,
          points,
        };
      }),
    };
  });

  return NextResponse.json({ rounds });
}
