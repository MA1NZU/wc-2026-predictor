import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

function calculatePoints(
  pred: { home_score: number; away_score: number },
  match: { home_score: number | null; away_score: number | null }
) {
  if (match.home_score === null || match.away_score === null) return 0;

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
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = await params; // Await params in Next.js App Router

    // 1. Fetch User
    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const user = { id: userSnap.id, ...userSnap.data() } as any;

    // 2. Fetch Predictions
    const predSnap = await db
      .collection("predictions")
      .where("user_id", "==", userId)
      .get();
    
    // 3. Fetch Matches
    const matchSnap = await db.collection("matches").get();

    // 4. Fetch Double Picks
    const doubleSnap = await db
      .collection("double_picks")
      .where("user_id", "==", userId)
      .get();

    // Prepare Maps
    const matchesMap = new Map<string, any>();
    matchSnap.docs.forEach((doc) => {
      matchesMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    const doubleSet = new Set<string>();
    doubleSnap.docs.forEach((doc) => {
      doubleSet.add(doc.data().match_id);
    });

    // Map and calculate points
    const predictionsDetail = predSnap.docs
      .map((predDoc) => {
        const pred = { id: predDoc.id, ...predDoc.data() };
        const match = matchesMap.get(pred.match_id);
        
        if (!match) return null;

        const base = calculatePoints(pred, match);
        const isDoubled = doubleSet.has(pred.match_id);
        const points = base * (isDoubled ? 2 : 1);

        return {
          id: pred.id,
          matchId: pred.match_id,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          matchDate: match.match_date,
          homeScore: match.home_score,
          awayScore: match.away_score,
          isLive: match.is_live || false,
          predictedHome: pred.home_score,
          predictedAway: pred.away_score,
          isDoubled,
          basePoints: base,
          points,
          hasScore: match.home_score !== null && match.away_score !== null,
        };
      })
      .filter(Boolean);

    // Sort by date
    predictionsDetail.sort(
      (a: any, b: any) =>
        new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    );

    // Sum points
    let totalPoints = 0;
    predictionsDetail.forEach((p: any) => {
      totalPoints += p.points;
    });

    return NextResponse.json({
      user: { id: user.id, username: user.username },
      totalPoints,
      predictionsCount: predictionsDetail.length,
      predictions: predictionsDetail,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
