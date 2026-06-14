import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";
import { getCache, setCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

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
  try {
    const user = await getUser();

    const cacheKey = `rounds-data-${Math.floor(Date.now() / 60_000)}`;
    let cachedData = getCache<any>(cacheKey, 60_000);

    let roundsData, matchesData;
    if (cachedData) {
      roundsData = cachedData.rounds;
      matchesData = cachedData.matches;
    } else {
      const roundsSnap = await db.collection("rounds").orderBy("order", "asc").get();
      const matchesSnap = await db.collection("matches").orderBy("order", "asc").get();

      roundsData = roundsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      matchesData = matchesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

      setCache(cacheKey, { rounds: roundsData, matches: matchesData }, 60_000);
    }

    const matchesMap = new Map<string, any>();
    matchesData.forEach((m: any) => matchesMap.set(m.id, m));

    const predictionsMap = new Map<string, any>();
    const doublePicksSet = new Set<string>();

    if (user) {
      const [predsSnap, dpSnap] = await Promise.all([
        db.collection("predictions").where("userId", "==", user.userId).get(),
        db.collection("doublePicks").where("userId", "==", user.userId).get(),
      ]);

      predsSnap.docs.forEach((doc) => {
        const d = doc.data();
        predictionsMap.set(d.matchId, d);
      });

      dpSnap.docs.forEach((doc) => {
        doublePicksSet.add(doc.data().matchId);
      });
    }

    const rounds = roundsData.map((round: any) => {
      const roundMatches = Array.from(matchesMap.values()).filter((m: any) => m.roundId === round.id);

      return {
        id: round.id,
        name: round.name,
        status: round.status,
        order: round.order || 0,
        matches: roundMatches.map((match: any) => {
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
            isLive: match.isLive ?? false,
            prediction: pred ? { homeScore: pred.homeScore, awayScore: pred.awayScore } : null,
            doublePick: double,
            points,
          };
        }),
      };
    });

    return NextResponse.json({ rounds });
  } catch (err: any) {
    console.error("Rounds API error:", err?.message || err);
    return NextResponse.json({ rounds: [] });
  }
}
