import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

function calculatePoints(
  pred: { home_score?: number; away_score?: number },
  match: { home_score?: number | null; away_score?: number | null }
) {
  // FIX: Handle undefined scores gracefully
  if (match.home_score == null || match.away_score == null) return 0;
  if (pred.home_score == null || pred.away_score == null) return 0;

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

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } | Promise<{ userId: string }> }
) {
  try {
    const { userId } = await Promise.resolve(params);
    if (!userId) {
      return NextResponse.json({ error: "User ID missing" }, { status: 400 });
    }

    // 1. Fetch User
    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userSnap.data() || {};
    const user = { id: userSnap.id, ...userData } as any;

    // 2. Fetch Predictions (Try both 'user_id' and 'userId' just in case)
    let predSnap = await db.collection("predictions").where("user_id", "==", userId).get();
    if (predSnap.empty) {
      predSnap = await db.collection("predictions").where("userId", "==", userId).get();
    }

    // 3. Fetch Matches
    const matchSnap = await db.collection("matches").get();

    // 4. Fetch Double Picks (Try both 'user_id' and 'userId')
    let doubleSnap = await db.collection("double_picks").where("user_id", "==", userId).get();
    if (doubleSnap.empty) {
      doubleSnap = await db.collection("double_picks").where("userId", "==", userId).get();
    }

    // Prepare Matches Map
    const matchesMap = new Map<string, any>();
    matchSnap.docs.forEach((doc) => {
      const data = doc.data() || {};
      matchesMap.set(doc.id, { id: doc.id, ...data });
    });

    // Prepare Double Picks Set
    const doubleSet = new Set<string>();
    doubleSnap.docs.forEach((doc) => {
      const data = doc.data() || {};
      // FIX: Handle both 'match_id' and 'matchId'
      const matchKey = data.match_id || data.matchId;
      if (matchKey) doubleSet.add(matchKey);
    });

    // Map and calculate points
    const predictionsDetail = predSnap.docs
      .map((predDoc) => {
        const data = predDoc.data() || {};
        const pred = { id: predDoc.id, ...data } as any;

        // FIX: Handle both 'match_id' and 'matchId' when looking up match
        const matchKey = pred.match_id || pred.matchId;
        const match = matchesMap.get(matchKey);

        if (!match) return null; // Skip if match doesn't exist

        const base = calculatePoints(pred, match);
        const isDoubled = doubleSet.has(matchKey);
        const points = base * (isDoubled ? 2 : 1);

        return {
          id: pred.id,
          matchId: matchKey,
          homeTeam: match.home_team || match.homeTeam || "TBD",
          awayTeam: match.away_team || match.awayTeam || "TBD",
          matchDate: match.match_date || match.matchDate || new Date().toISOString(),
          homeScore: match.home_score ?? null,
          awayScore: match.away_score ?? null,
          isLive: match.is_live ?? false,
          predictedHome: pred.home_score ?? pred.homeScore,
          predictedAway: pred.away_score ?? pred.awayScore,
          isDoubled,
          basePoints: base,
          points,
          hasScore: match.home_score != null && match.away_score != null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Sort by date
    predictionsDetail.sort(
      (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    );

    // Sum points
    let totalPoints = 0;
    predictionsDetail.forEach((p) => {
      totalPoints += p.points || 0;
    });

    return NextResponse.json({
      user: { id: user.id, username: user.username },
      totalPoints,
      predictionsCount: predictionsDetail.length,
      predictions: predictionsDetail,
    });
  } catch (error) {
    console.error(">>> [LEADERBOARD ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
