import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";
import { clearCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, homeScore, awayScore } = await req.json();

    const updateData: any = {};
    if (homeScore !== undefined) updateData.homeScore = homeScore === null ? null : Number(homeScore);
    if (awayScore !== undefined) updateData.awayScore = awayScore === null ? null : Number(awayScore);
    updateData.updatedAt = new Date();

    await db.collection("matches").doc(id).update(updateData);

    clearCache();

    const doc = await db.collection("matches").doc(id).get();
    return NextResponse.json({ match: { id: doc.id, ...doc.data() } });
  } catch (err: any) {
    console.error("Update score error:", err?.message || err);
    return NextResponse.json({ error: "Failed to update score" }, { status: 500 });
  }
}
