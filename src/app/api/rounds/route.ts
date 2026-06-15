import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";
import { getCache, setCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

function calculatePoints(
  pred: { home_score: number; away_score: number },
  match: { home_score: number | null; away_score: number | null }
) {
  if (match.home_score === null || match.away_score === null) return null;

  if (pred.home_score === match.home_score && pred.away_score === match.away_score) return 6;

  const predOutcome =
    pred.home_score > pred.away_score
      ? "home"
      : pred.home_score < pred.away_score
      ? "away"
      : "draw";

  const actOutcome =
    match.home_score > match.away_score
      ? "home"
      : match.home_score < match.away_score
      ? "away"
      : "draw";

  if (predOutcome === actOutcome) return 3;

  return 0;
}

export async function GET() {
  try {
    const user = await getUser();
    const cacheKey = `rounds-data-${Math.floor(Date.now() / 60_000)}`;
    let cachedData = getCache<any>(cacheKey, 60_000);

    let roundsData: any[] = [];
    let matchesData: any[] = [];

    if (cachedData) {
      roundsData = cachedData.rounds;
      matchesData = cachedData.matches;
    } else {
      // Firebase Admin Queries for Rounds and Matches
      const roundsSnap = await db.collection("rounds").orderBy("order_num", "asc").get();
      const matchesSnap = await db.collection("matches").orderBy("order_num", "asc").get();

      roundsData = roundsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      matchesData = matchesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      setCache(cacheKey, { rounds: roundsData, matches: matchesData }, 60_000);
    }

    const matchesMap = new Map<string, any>();
    matchesData.forEach((m) => matchesMap.set(m.id, m));

    let predictionsMap = new Map<string, any>();
    let doublePicksSet = new Set<string>();

    if (user) {
      // Firebase Admin Queries for User Data
      const predSnap = await db
        .collection("predictions")
        .where("user_id", "==", user.userId)
        .get();

      const doubleSnap = await db
        .collection("double_picks")
        .where("user_id", "==", user.userId)
        .get();

      predSnap.forEach((doc) => {
        const data = doc.data() as any;
        predictionsMap.set(data.match_id, { id: doc.id, ...data });
      });

      doubleSnap.forEach((doc) => {
        const data = doc.data() as any;
        doublePicksSet.add(data.match_id);
      });
    }

    // Process Rounds and Matches
    const rounds = roundsData.map((round: any) => {
      const roundMatches = matchesData.filter((m) => m.round_id === round.id || m.round_id === round.round_id);

      return {
        id: round.id,
        name: round.name,
        status: round.status,
        order: round.order_num || round.order || 0,
        matches: roundMatches.map((match: any) => {
          const pred = predictionsMap.get(match.id) || null;
          const double = doublePicksSet.has(match.id);
          const basePoints = pred ? calculatePoints(pred, match) : null;
          const points = basePoints !== null ? (double ? basePoints * 2 : basePoints) : null;

          return {
            id: match.id,
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            matchDate: match.match_date,
            homeScore: match.home_score ?? null,
            awayScore: match.away_score ?? null,
            isLive: match.is_live ?? false, // Fixed corrupted variable name
            prediction: pred
              ? { homeScore: pred.home_score, awayScore: pred.away_score }
              : null,
            doublePick: double,
            points,
          };
        }),
      };
    });

    return NextResponse.json({ rounds });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ rounds: [] });
  }
}
