import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId, homeScore, awayScore } = await req.json();

  if (homeScore === undefined || awayScore === undefined || !matchId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const matchDoc = await db.collection("matches").doc(matchId).get();
  if (!matchDoc.exists) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const matchData = matchDoc.data()!;
  const roundDoc = await db.collection("rounds").doc(matchData.roundId).get();
  const roundData = roundDoc.data()!;

  if (roundData.status === "LIVE" || roundData.status === "FINISHED") {
    return NextResponse.json({ error: "Predictions are locked for this round" }, { status: 403 });
  }

  const predRef = db.collection("predictions").doc(`${user.userId}_${matchId}`);
  await predRef.set(
    {
      userId: user.userId,
      matchId,
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
      updatedAt: new Date(),
      createdAt: new Date(),
    },
    { merge: true }
  );

  const doc = await predRef.get();
  return NextResponse.json({ prediction: { id: doc.id, ...doc.data() } });
}
