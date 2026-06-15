import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { matchId, homeScore, awayScore } = await req.json();

    if (homeScore === undefined || awayScore === undefined || !matchId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 1. Fetch Match
    const matchSnap = await db.collection("matches").doc(matchId).get();
    if (!matchSnap.exists) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    // FIX: Removed markdown corruption from matchSnap.data()
    const matchData = matchSnap.data() as any;

    // 2. Fetch Round to check status
    let roundData: any = { status: "UPCOMING" };
    if (matchData.round_id) {
      const roundSnap = await db.collection("rounds").doc(matchData.round_id).get();
      if (roundSnap.exists) roundData = roundSnap.data();
    }

    // 3. Check Locking Conditions
    // FIX: Removed markdown corruption from matchData.is_live
    if (matchData.is_live || roundData.status === "LIVE" || roundData.status === "FINISHED") {
      return NextResponse.json({ error: "Predictions are locked for this match" }, { status: 403 });
    }

    // 4. Upsert Prediction
    const predData = {
      user_id: user.userId,
      match_id: matchId,
      home_score: Number(homeScore),
      away_score: Number(awayScore),
      updated_at: new Date(),
    };

    const predQuery = await db
      .collection("predictions")
      .where("user_id", "==", user.userId)
      .where("match_id", "==", matchId)
      .limit(1)
      .get();

    let prediction;
    if (!predQuery.empty) {
      // FIX: Removed markdown corruption from predQuery.docs[0]
      const docRef = predQuery.docs[0].ref;
      await docRef.update(predData);
      prediction = { id: docRef.id, ...predData };
    } else {
      const docRef = await db.collection("predictions").add(predData);
      prediction = { id: docRef.id, ...predData };
    }

    return NextResponse.json({ prediction });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
