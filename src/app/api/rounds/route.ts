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

    const roundsData = roundsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const matchesData = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
        console.log(`>>> [DB] NO predictions found. Checking if the table has data...`);
        const anyPred = await db.collection("predictions").limit(1).get();
        if (!anyPred.empty) {
           console.log(`>>> [DB] Sample found. Fields:`, Object.keys(anyPred.docs[0].data()));
        }
      }

      predSnap.forEach(doc => {
        const data = doc.data() as any;
        // FIX: Check for both "match_id" and "matchId"
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
      const roundMatches = matchesData.filter(m => 
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
    console.error(">>> [ERROR]", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
