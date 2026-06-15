import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// FIX: Return null if match hasn't been played, so frontend shows "Pending"
function calculatePoints(
  pred: { home_score?: number; away_score?: number },
  match: { home_score?: number | null; away_score?: number | null }
) {
  // If match score is missing, points cannot be calculated yet
  if (match.home_score == null || match.away_score == null) return null;
  if (pred.home_score == null || pred.away_score == null) return null;

  // Exact score match = 6 pts
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

  // Correct winner/draw = 3 pts
  if (predOutcome === actOutcome) return 3;
  
  // Wrong outcome = 0 pts (This is a real Miss)
  return 0; 
}

export async function GET() {
  try {
    const user = await getUser();

    // 1. Fetch Rounds & Matches
    const roundsSnap = await db.collection("rounds").orderBy("order", "asc").get();
    const matchesSnap = await db.collection("matches").orderBy("order", "asc").get();

    const roundsData = roundsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const matchesData = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Fetch Predictions
    let predictionsMap = new Map<string, any>();
    let doublePicksSet = new Set<string>();

    if (user && user.userId) {
      // Try 'user_id' then 'userId'
      let predSnap = await db.collection("predictions").where("user_id", "==", user.userId).get();
      if (predSnap.empty) {
        predSnap = await db.collection("predictions").where("userId", "==", user.userId).get();
      }

      if (!predSnap.empty) {
        predSnap.forEach((doc: any) => {
          const data = doc.data() as any;
          const matchKey = data.match_id || data.matchId;
          if (matchKey) predictionsMap.set(matchKey, { id: doc.id, ...data });
        });
      }

      // Fetch Double Picks
      let doubleSnap = await db.collection("double_picks").where("user_id", "==", user.userId).get();
      if (doubleSnap.empty) {
        doubleSnap = await db.collection("double_picks").where("userId", "==", user.userId).get();
      }

      if (!doubleSnap.empty) {
        doubleSnap.forEach((doc: any) => {
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

          // FIX: calculatePoints will return null if match.home_score is null
          let points = null;
          if (pred) {
             points = calculatePoints(pred, match);
             // Only double if points exist (not null) and are > 0
             if (points !== null && isDoubled) points *= 2;
          }

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
            points: points, // Will be null for unplayed, 0 for miss, 3/6 for hit
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
