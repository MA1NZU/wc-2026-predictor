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

    if (!id) {
      return NextResponse.json({ error: "Match ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (homeScore !== undefined) updateData.home_score = homeScore === null ? null : Number(homeScore);
    if (awayScore !== undefined) updateData.away_score = awayScore === null ? null : Number(awayScore);

    // Firebase Admin Update
    const matchRef = db.collection("matches").doc(id);
    await matchRef.update(updateData);

    // Fetch the updated document to return it
    const matchSnap = await matchRef.get();

    if (!matchSnap.exists) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    clearCache();

    return NextResponse.json({ 
      match: { 
          id: matchSnap.id, 
          ...matchSnap.data() 
      } 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update score" }, { status: 500 });
  }
}
