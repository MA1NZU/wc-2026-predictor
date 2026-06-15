import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getUser();
    console.log(`>>> [API] Fetching rounds for User: ${user?.userId || "Guest"}`);

    // 1. Fetch Rounds & Matches
    const roundsSnap = await db.collection("rounds").orderBy("order", "asc").get();
    const matchesSnap = await db.collection("matches").orderBy("order", "asc").get();

    // FIX: Explicitly type as any[] so TypeScript allows accessing dynamic fields
    const roundsData: any[] = roundsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const matchesData: any[] = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let predictionsMap = new Map<string, any>();
    let doublePicksSet = new Set<string>();

    // 2. Fetch User Predictions
    if (user && user.userId) {
      console.log(`>>> [DB] Querying predictions where user_id == "${user.userId}"`);
      
      const predSnap = await db
        .collection("predictions")
        .where("user_id", "==", user.userId)
        .get();

      if (predSnap.empty) {
        console.log(`>>> [DB] No predictions found for this user.`);
      }

      predSnap.forEach(doc => {
        const data = doc.data() as any;
        // Handle both snake_case and camelCase field names
        const matchKey = data.match_id || data.matchId || data.matchID;
        if (matchKey) {
          predictionsMap.set(matchKey, { id: doc.id, ...data });
        }
      });

      // Fetch Double Picks
      const doubleSnap = await db.collection("double_picks").where("user_id", "==", user.userId).get();
      doubleSnap.forEach(doc => {
        const data = doc.data() as any;
        const matchKey = data.match_id || data.matchId;
        if (matchKey) doublePicksSet.add(matchKey);
      });
    }

    // 3. Merge Data
    const rounds = roundsData.map((round: any) => {
      // FIX: Type 'm' as any to allow accessing round_id or roundId
      const roundMatches = matchesData.filter((m: any) => 
        m.round_id === round.id || m.roundId === round.id
      );

      return {
        id: round.id,
        name: round.name,
        status: round.status,
        order: round.order_num || round.order || 0,
        matches: roundMatches.map((match: any) => {
          const pred = predictionsMap.get(match.id) || null;
          const isDoubled = doublePicksSet.has(match.id);

          return {
            id: match.id,
            homeTeam: match.home_team || match.homeTeam || "TBD",
            awayTeam: match.away_team || match.awayTeam || "TBD",
            matchDate: match.match_date || match.matchDate,
            homeScore: match.home_score ?? null,
            awayScore: match.away_score ?? null,
            isLive: match.is_live ?? false,
            prediction: pred ? { 
               homeScore: pred.home_score ?? pred.homeScore, 
               awayScore: pred.away_score ?? pred.awayScore 
            } : null,
            doublePick: isDoubled,
            points: null,
          };
        }),
      };
    });

    return NextResponse.json({ rounds });
  } catch (error) {
    console.error(">>> [API ERROR]", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
