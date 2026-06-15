import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

// Re-usable calculation logic
function calculatePoints(
  pred: { home_score?: number; away_score?: number },
  match: { home_score?: number | null; away_score?: number | null }
) {
  if (match.home_score == null || match.away_score == null) return 0;
  if (pred.home_score == null || pred.away_score == null) return 0;

  if (pred.home_score === match.home_score && pred.away_score === match.away_score) return 6;

  const predOutcome = pred.home_score > pred.away_score ? "home" : pred.home_score < pred.away_score ? "away" : "draw";
  const actOutcome = match.home_score > match.away_score ? "home" : match.home_score < match.away_score ? "away" : "draw";

  if (predOutcome === actOutcome) return 3;
  return 0;
}

export async function GET() {
  try {
    // 1. Fetch All Users
    const usersSnap = await db.collection("users").get();
    
    // 2. Fetch All Matches
    const matchesSnap = await db.collection("matches").get();
    
    // 3. Fetch All Predictions
    const predictionsSnap = await db.collection("predictions").get();
    
    // 4. Fetch All Double Picks
    const doublePicksSnap = await db.collection("double_picks").get();

    // --- Build Maps ---

    // Matches Map
    const matchesMap = new Map<string, any>();
    matchesSnap.forEach(doc => {
      matchesMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    // Double Picks Map: Key = userId, Value = Set of matchIds
    const userDoublesMap = new Map<string, Set<string>>();
    doublePicksSnap.forEach(doc => {
      const data = doc.data() as any;
      const uid = data.user_id || data.userId;
      const mid = data.match_id || data.matchId;
      
      if (uid && mid) {
        if (!userDoublesMap.has(uid)) userDoublesMap.set(uid, new Set());
        userDoublesMap.get(uid)!.add(mid);
      }
    });

    // Predictions Map: Key = userId, Value = Array of predictions
    const userPredictionsMap = new Map<string, any[]>();
    predictionsSnap.forEach(doc => {
      const data = doc.data() as any;
      const uid = data.user_id || data.userId;
      if (uid) {
        if (!userPredictionsMap.has(uid)) userPredictionsMap.set(uid, []);
        userPredictionsMap.get(uid)!.push({ id: doc.id, ...data });
      }
    });

    // --- Calculate Leaderboard ---
    const leaderboard = usersSnap.docs.map(userDoc => {
      const user = { id: userDoc.id, ...userDoc.data() } as any;
      const userId = user.id;
      
      let totalPoints = 0;
      let predictionCount = 0;

      const userPreds = userPredictionsMap.get(userId) || [];
      const userDoubles = userDoublesMap.get(userId) || new Set();

      userPreds.forEach(pred => {
        // Handle field name mismatch for match ID
        const matchId = pred.match_id || pred.matchId;
        const match = matchesMap.get(matchId);

        if (match) {
          predictionCount++;
          const base = calculatePoints(pred, match);
          const isDoubled = userDoubles.has(matchId);
          totalPoints += base * (isDoubled ? 2 : 1);
        }
      });

      return {
        id: user.id,
        username: user.username,
        totalPoints,
        predictionsCount,
      };
    });

    // Sort by points descending
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error(">>> [LEADERBOARD ERROR]", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
