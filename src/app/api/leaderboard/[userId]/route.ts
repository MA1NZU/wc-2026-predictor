import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

// FIX: Updated types to accept null values from Firestore
function calculatePoints(
  pred: { home_score?: number | null; away_score?: number | null },
  match: { home_score?: number | null; away_score?: number | null }
) {
  // If match or prediction score is missing, return null (Pending)
  if (match.home_score == null || match.away_score == null) return null;
  if (pred.home_score == null || pred.away_score == null) return null;

  // Exact score match = 6 pts
  if (pred.home_score === match.home_score && pred.away_score === match.away_score) return 6;

  const predOutcome =
    pred.home_score > pred.away_score ? "home" : pred.home_score < pred.away_score ? "away" : "draw";
  const actOutcome =
    match.home_score > match.away_score ? "home" : match.home_score < match.away_score ? "away" : "draw";

  // Correct outcome = 3 pts
  if (predOutcome === actOutcome) return 3;
  
  return 0;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } | Promise<{ userId: string }> }
) {
  try {
    const { userId } = await Promise.resolve(params);
    if (!userId) return NextResponse.json({ error: "User ID missing" }, { status: 400 });

    // 1. Fetch User
    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const userData = userSnap.data() || {};
    const user = { id: userSnap.id, ...userData } as any;

    // 2. Fetch Rounds
    const roundsSnap = await db.collection("rounds").orderBy("order", "asc").get();

    // 3. Fetch Matches
    const matchesSnap = await db.collection("matches").orderBy("order", "asc").get();

    // 4. Fetch Predictions
    let predSnap = await db.collection("predictions").where("user_id", "==", userId).get();
    if (predSnap.empty) {
      predSnap = await db.collection("predictions").where("userId", "==", userId).get();
    }

    // 5. Fetch Double Picks
    let doubleSnap = await db.collection("double_picks").where("user_id", "==", userId).get();
    if (doubleSnap.empty) {
      doubleSnap = await db.collection("double_picks").where("userId", "==", userId).get();
    }

    // --- Data Processing ---
    const matchesMap = new Map<string, any>();
    matchesSnap.forEach((doc) => matchesMap.set(doc.id, { id: doc.id, ...doc.data() }));

    const doubleSet = new Set<string>();
    doubleSnap.forEach((doc) => {
      const data = doc.data() as any;
      const matchKey = data.match_id || data.matchId;
      if (matchKey) doubleSet.add(matchKey);
    });

    const predsMap = new Map<string, any>();
    predSnap.forEach((doc) => {
      const data = doc.data() as any;
      const matchKey = data.match_id || data.matchId;
      if (matchKey) predsMap.set(matchKey, { id: doc.id, ...data });
    });

    let totalPoints = 0;

    // Group data by Rounds (Weeks)
    const roundsWithMatches = roundsSnap.docs.map((roundDoc) => {
      const roundData = roundDoc.data() as any;
      const roundId = roundDoc.id;

      // Find matches belonging to this round
      const roundMatches = matchesSnap.docs
        .filter((matchDoc) => {
          const mData = matchDoc.data() as any;
          return (mData.round_id || mData.roundId) === roundId;
        })
        .map((matchDoc) => {
          const matchData = matchDoc.data() as any;
          const matchId = matchDoc.id;
          const pred = predsMap.get(matchId);
          const isDoubled = doubleSet.has(matchId);

          let points = null;
          let basePoints = 0;

          if (pred) {
            // FIX: Pass values directly (even if null) to calculatePoints
            basePoints = calculatePoints({ 
              home_score: pred.home_score, 
              away_score: pred.away_score 
            }, matchData);
            
            if (basePoints !== null) {
              points = basePoints * (isDoubled ? 2 : 1);
              totalPoints += points;
            }
          }

          return {
            id: matchId,
            homeTeam: matchData.home_team || matchData.homeTeam || "TBD",
            awayTeam: matchData.away_team || matchData.awayTeam || "TBD",
            matchDate: matchData.match_date || matchData.matchDate || new Date().toISOString(),
            homeScore: matchData.home_score ?? null,
            awayScore: matchData.away_score ?? null,
            isLive: matchData.is_live ?? false,
            prediction: pred
              ? { homeScore: pred.home_score, awayScore: pred.away_score }
              : null,
            doublePick: isDoubled,
            points,
            basePoints,
            hasScore: matchData.home_score != null && matchData.away_score != null,
          };
        });

      // Sort matches within the round by date
      roundMatches.sort(
        (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
      );

      return {
        id: roundId,
        name: roundData.name,
        status: roundData.status,
        matches: roundMatches,
      };
    });

    // Add bonus points
    totalPoints += user.bonusPoints || 0;

    return NextResponse.json({
      user: { id: user.id, username: user.username },
      totalPoints,
      rounds: roundsWithMatches,
    });

  } catch (error) {
    console.error(">>> [PLAYER DETAILS ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
