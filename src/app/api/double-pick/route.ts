import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId, roundId } = await req.json();

  const matchDoc = await db.collection("matches").doc(matchId).get();
  if (!matchDoc.exists) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const matchData = matchDoc.data()!;
  const roundDoc = await db.collection("rounds").doc(matchData.roundId).get();
  const roundData = roundDoc.data()!;

  if (roundData.status === "LIVE" || roundData.status === "FINISHED") {
    return NextResponse.json({ error: "Round is locked" }, { status: 403 });
  }

  const existing = await db.collection("doublePicks").where("userId", "==", user.userId).where("roundId", "==", roundId).get();

  const batch = db.batch();
  existing.docs.forEach((doc) => batch.delete(doc.ref));

  const newRef = db.collection("doublePicks").doc();
  batch.set(newRef, {
    userId: user.userId,
    roundId,
    matchId,
    createdAt: new Date(),
  });

  await batch.commit();

  const doc = await newRef.get();
  return NextResponse.json({ doublePick: { id: doc.id, ...doc.data() } });
}
