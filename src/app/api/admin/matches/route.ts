import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";
import { clearCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { roundId, homeTeam, awayTeam, matchDate, order } = await req.json();

    const ref = db.collection("matches").doc();
    await ref.set({
      roundId,
      homeTeam,
      awayTeam,
      matchDate: matchDate || new Date().toISOString(),
      order: order || 0,
      isLive: false,
      createdAt: new Date(),
    });

    clearCache();

    const doc = await ref.get();
    return NextResponse.json({ match: { id: doc.id, ...doc.data() } });
  } catch (err: any) {
    console.error("Create match error:", err?.message || err);
    return NextResponse.json({ error: "Failed to create match" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, homeTeam, awayTeam, matchDate, order, isLive } = await req.json();

    const updateData: any = {};
    if (homeTeam !== undefined) updateData.homeTeam = homeTeam;
    if (awayTeam !== undefined) updateData.awayTeam = awayTeam;
    if (matchDate !== undefined) updateData.matchDate = matchDate;
    if (order !== undefined) updateData.order = order;
    if (isLive !== undefined) updateData.isLive = isLive;
    updateData.updatedAt = new Date();

    await db.collection("matches").doc(id).update(updateData);

    clearCache();

    const doc = await db.collection("matches").doc(id).get();
    return NextResponse.json({ match: { id: doc.id, ...doc.data() } });
  } catch (err: any) {
    console.error("Update match error:", err?.message || err);
    return NextResponse.json({ error: "Failed to update match" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await req.json();
    await db.collection("matches").doc(id).delete();

    clearCache();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete match error:", err?.message || err);
    return NextResponse.json({ error: "Failed to delete match" }, { status: 500 });
  }
}
