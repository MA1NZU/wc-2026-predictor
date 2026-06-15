import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";
import { clearCache } from "@/lib/cache";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { roundId, homeTeam, awayTeam, matchDate, order } = await req.json();

    const matchData = {
      round_id: roundId,
      home_team: homeTeam,
      away_team: awayTeam,
      match_date: matchDate || new Date().toISOString(),
      order_num: order || 0,
      is_live: false,
      created_at: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "matches"), matchData);

    clearCache();
    return NextResponse.json({ match: { id: docRef.id, ...matchData } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create match" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, homeTeam, awayTeam, matchDate, order, isLive } = await req.json();

    const updateData: any = {};
    if (homeTeam !== undefined) updateData.home_team = homeTeam;
    if (awayTeam !== undefined) updateData.away_team = awayTeam;
    if (matchDate !== undefined) updateData.match_date = matchDate;
    if (order !== undefined) updateData.order_num = order;
    if (isLive !== undefined) updateData.is_live = isLive;
    updateData.updated_at = serverTimestamp();

    await updateDoc(doc(db, "matches", id), updateData);

    clearCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update match" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await req.json();

    await deleteDoc(doc(db, "matches", id));

    clearCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete match" }, { status: 500 });
  }
}
