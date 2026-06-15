import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { matchId, roundId } = await req.json();

    // 1. Fetch Match
    const matchSnap = await db.collection("matches").doc(matchId).get();
    if (!matchSnap.exists) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    const matchData = matchSnap.data() as any;

    // 2. Fetch Round to check status
    // Note: We use the roundId from the request body.
    const roundSnap = await db.collection("rounds").doc(roundId).get();
    if (!roundSnap.exists) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }
    const roundData = roundSnap.data() as any;

    // 3. Check Locking Conditions
    // Fixed corrupted variable name: matchData.is_live
    if (matchData.is_live || roundData.status === "LIVE" || roundData.status === "FINISHED") {
      return NextResponse.json({ error: "Round is locked" }, { status: 403 });
    }

    // 4. Delete existing picks for this user/round
    // Firestore requires querying then deleting in a batch
    const picksQuery = db.collection("double_picks")
        .where("user_id", "==", user.userId)
        .where("round_id", "==", roundId);
    
    const picksSnap = await picksQuery.get();
    const batch = db.batch();
    
    picksSnap.forEach((doc) => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();

    // 5. Insert new pick
    const newPickData = {
        user_id: user.userId,
        round_id: roundId,
        match_id: matchId,
        createdAt: new Date()
    };
    
    const docRef = await db.collection("double_picks").add(newPickData);

    return NextResponse.json({ 
        doublePick: { id: docRef.id, ...newPickData } 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
