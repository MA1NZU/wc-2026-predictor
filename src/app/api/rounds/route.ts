import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";
import { getCache, setCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getUser();
    const cacheKey = `rounds-data-${Math.floor(Date.now() / 60_000)}`;
    const cachedData = getCache<any>(cacheKey, 60_000);

    let roundsData: any[] = [];
    let matchesData: any[] = [];

    if (cachedData) {
      roundsData = cachedData.rounds;
      matchesData = cachedData.matches;
    } else {
      // Fetch from Firestore
      const roundsSnap = await db.collection("rounds").orderBy("order", "asc").get();
      const matchesSnap = await db.collection("matches").orderBy("order", "asc").get();

      roundsData = roundsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      matchesData = matchesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      setCache(cacheKey, { rounds: roundsData, matches: matchesData }, 60_000);
    }

    // If user is logged in, fetch their predictions & double picks
    let predictionsMap = new Map<string, any>();
    let doublePicksSet = new Set<string>();

    if (user) {
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

    // Merge everything
    const rounds = roundsData.map((round: any) => {
      const roundMatches = matchesData.filter(
        (m) => m.round_id === round.id || m.roundId === round.id
      );

      return {
        id: round.id,
        name: round.name,
        status: round.status,
        order: round.order_num || round.order || 0,
        matches: roundMatches.map((match: any) => {
          const pred = predictionsMap.get(match.id) || null;
          const double = doublePicksSet.has(match.id);

          return {
            id: match.id,
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            matchDate: match.match_date,
            homeScore: match.home_score ?? null,
            awayScore: match.away_score ?? null,
            isLive: match.is_live ?? false,
            prediction: pred
              ? { homeScore: pred.home_score, awayScore: pred.away_score }
              : null,
            doublePick: double,
            points: null, // Calculated on frontend or leaderboard
          };
        }),
      };
    });

    return NextResponse.json({ rounds });
  } catch (error) {
    console.error("Error fetching rounds:", error);
    return NextResponse.json({ rounds: [] }, { status: 500 });
  }
}
