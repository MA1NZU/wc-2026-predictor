import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getUser();
    console.log(`>>> [ROUNDS] Fetching data for: ${user?.userId || "Guest"}`);

    // 1. Fetch Rounds & Matches
    const roundsSnap = await db.collection("rounds").orderBy("order", "asc").get();
    const matchesSnap = await db.collection("matches").orderBy("order", "asc").get();

    const roundsData = roundsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const matchesData = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let predictionsMap = new Map<string, any>();
    let doublePicksSet = new Set<string>();

    // 2. Fetch User Predictions (Robustly)
    if (user && user.userId) {
      let predSnap;
      
      // FIX: Try to find predictions using 'user_id' OR 'userId'
      // We use a Promise race to find which one works or just check both logic
      // But to be safe and simple, we filter in JS if the index fails, 
      // though usually, standardizing on 'user_id' in the DB is best.
      // Here, I will try 'user_id' first (standard Firebase convention for foreign keys).
      
      try {
        predSnap = await db.collection("predictions").where("user_id", "==", user.userId).get();
      } catch (e) {
        console.log(">>> [WARN] Index error or field missing for user_id");
        predSnap = { empty: true, docs: [] } as any; // Fallback
      }

      // If not found, try 'userId'
      if (predSnap.empty) {
         try {
           predSnap = await db.collection("predictions").where("userId", "==", user.userId).get();
         } catch (e) { /* ignore */ }
      }

      if (!predSnap.empty) {
        console.log(`>>> [ROUNDS] Found ${predSnap.size} predictions`);
        predSnap.forEach(doc => {
          const data = doc.data() as any;
          // FIX: Match ID can be 'match_id' OR 'matchId'
          const matchKey = data.match_id || data.matchId; 
          if (matchKey) {
            predictionsMap.set(matchKey, { id: doc.id, ...data });
          }
        });
      } else {
        console.log(">>> [ROUNDS] No predictions found. Check DB field names!");
      }

      // Fetch Double Picks (Robustly)
      let doubleSnap;
      try {
        doubleSnap = await db.collection("double_picks").where("user_id", "==", user.userId).get();
      } catch (e) { doubleSnap = { empty: true, docs: [] } as any; }

      if (doubleSnap.empty) {
         try { doubleSnap = await db.collection("double_picks").where("userId", "==", user.userId).get(); } catch (e) { /* */ }
      }

      if (!doubleSnap.empty) {
        doubleSnap.forEach(doc => {
          const data = doc.data() as any;
          const matchKey = data.match_id || data.matchId;
          if (matchKey) doublePicksSet.add(matchKey);
        });
      }
    }

    // 3. Merge Data
    const rounds = roundsData.map((round: any) => {
      const roundMatches = matchesData.filter((m: any) => 
        (m.round_id || m.roundId) === round.id
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
    console.error(">>> [ROUNDS ERROR]", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
