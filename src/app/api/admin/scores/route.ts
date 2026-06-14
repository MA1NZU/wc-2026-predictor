import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, homeScore, awayScore } = await req.json();

  const updateData: any = {};
  if (homeScore !== undefined) updateData.homeScore = homeScore === null ? null : Number(homeScore);
  if (awayScore !== undefined) updateData.awayScore = awayScore === null ? null : Number(awayScore);
  updateData.updatedAt = new Date();

  await db.collection("matches").doc(id).update(updateData);
  const doc = await db.collection("matches").doc(id).get();
  return NextResponse.json({ match: { id: doc.id, ...doc.data() } });
}
