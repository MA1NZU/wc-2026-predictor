import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase"; // Admin SDK
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { matchId, homeScore, awayScore } = await req.json();
    if (!matchId || homeScore === undefined || awayScore === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const matchSnap = await db.collection("matches").doc(matchId).get();
    if (!matchSnap.exists) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    const matchData = matchSnap.data() as any;

    // Lock check
    let roundData: any = { status: "OPEN" };
    if (matchData.round_id) {
      const rSnap = await db.collection("rounds").doc(matchData.round_id).get();
      if (rSnap.exists) roundData = rSnap.data();
    }
    if (matchData.is_live || roundData.status === "LIVE" || roundData.status === "FINISHED") {
      return NextResponse.json({ error: "Locked" }, { status: 403 });
    }

    // Upsert Logic
    const predData = { user_id: user.userId, match_id: matchId, home_score: Number(homeScore), away_score: Number(awayScore), updated_at: new Date() };
    
    // Try to find existing prediction (handles both casings)
    let predQuery = await db.collection("predictions").where("user_id", "==", user.userId).where("match_id", "==", matchId).limit(1).get();
    if (predQuery.empty) {
       predQuery = await db.collection("predictions").where("userId", "==", user.userId).where("matchId", "==", matchId).limit(1).get();
    }

    if (!predQuery.empty) {
      await predQuery.docs[0].ref.update(predData);
      return NextResponse.json({ success: true });
    } else {
      await db.collection("predictions").add(predData);
      return NextResponse.json({ success: true });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
