import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

// FIX: Returns null instead of 0 for unplayed matches
function calculatePoints(
  pred: { home_score?: number; away_score?: number },
  match: { home_score?: number | null; away_score?: number | null }
) {
  if (match.home_score == null || match.away_score == null) return null;
  if (pred.home_score == null || pred.away_score == null) return null;

  if (pred.home_score === match.home_score && pred.away_score === match.away_score) return 6;

  const predOutcome =
    pred.home_score > pred.away_score ? "home" : pred.home_score < pred.away_score ? "away" : "draw";
  const actOutcome =
    match.home_score > match.away_score ? "home" : match.home_score < match.away_score ? "away" : "draw";

  if (predOutcome === actOutcome) return 3;
  return 0; // Only returns 0 for actual wrong predictions
}

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } | Promise<{ userId: string }> }
) {
  try {
    const { userId } = await Promise.resolve(params);
    if (!userId) return NextResponse.json({ error: "User ID missing" }, { status: 400 });

    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const userData = userSnap.data() || {};
    const user = { id: userSnap.id, ...userData } as any;

    // Fetch with flexible field names
    let predSnap = await db.collection("predictions").where("user_id", "==", userId).get();
    if (predSnap.empty) predSnap = await db.collection("predictions").where("userId", "==", userId).get();

    const matchSnap = await db.collection("matches").get();

    let doubleSnap = await db.collection("double_picks").where("user_id", "==", userId).get();
    if (doubleSnap.empty) doubleSnap = await db.collection("double_picks").where("userId", "==", userId).get();

    const matchesMap = new Map<string, any>();
    matchSnap.docs.forEach((doc) => {
      const data = doc.data() || {};
      matchesMap.set(doc.id, { id: doc.id, ...data });
    });

    const doubleSet = new Set<string>();
    doubleSnap.docs.forEach((doc) => {
      const data = doc.data() || {};
      const matchKey = data.match_id || data.matchId;
      if (matchKey) doubleSet.add(matchKey);
    });

    const predictionsDetail = predSnap.docs
      .map((predDoc) => {
        const data = predDoc.data() || {};
        const pred = { id: predDoc.id, ...data } as any;
        const matchKey = pred.match_id || pred.matchId;
        const match = matchesMap.get(matchKey);

        if (!match) return null;

        const base = calculatePoints(pred, match);
        const isDoubled = doubleSet.has(matchKey);
        
        // FIX: If base is null (pending), points stays null
        const points = base === null ? null : base * (isDoubled ? 2 : 1);

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
          points, // Now correctly null for pending
          hasScore: match.home_score != null && match.away_score != null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    predictionsDetail.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

    // FIX: Sum only valid points (ignore nulls)
    let totalPoints = 0;
    predictionsDetail.forEach((p) => {
      if (p.points !== null) totalPoints += p.points;
    });
    // Add bonus points if they exist
    totalPoints += user.bonusPoints || 0;

    return NextResponse.json({
      user: { id: user.id, username: user.username },
      totalPoints,
      predictionsCount: predictionsDetail.length,
      predictions: predictionsDetail,
    });
  } catch (error) {
    console.error(">>> [PLAYER DETAILS ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
