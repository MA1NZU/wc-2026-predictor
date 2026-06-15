import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";
import { getCache, setCache, clearCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cacheKey = `admin-rounds-${Math.floor(Date.now() / 60_000)}`;
    const cached = getCache<any>(cacheKey, 60_000);

    if (cached) return NextResponse.json({ rounds: cached });

    // Fetch rounds
    const roundsSnap = await db.collection("rounds").orderBy("order", "asc").get();

    // Fetch matches
    const matchesSnap = await db.collection("matches").orderBy("order", "asc").get();

    // Map matches to rounds
    const matchesMap = new Map<string, any[]>();
    matchesSnap.forEach((matchDoc) => {
      const data = matchDoc.data();
      // Note: Use 'round_id' or 'roundId' depending on your schema. 
      // The code below checks both for safety.
      const roundId = data.round_id || data.roundId; 
      if (roundId) {
        if (!matchesMap.has(roundId)) matchesMap.set(roundId, []);
        matchesMap.get(roundId)!.push({ id: matchDoc.id, ...data });
      }
    });

    // Format rounds with their matches
    const rounds = roundsSnap.docs.map((roundDoc) => ({
      id: roundDoc.id,
      ...roundDoc.data(),
      matches: matchesMap.get(roundDoc.id) || [],
    }));

    setCache(cacheKey, rounds, 60_000);
    return NextResponse.json({ rounds });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, status, order } = await req.json();

    // firebase-admin supports .add() which returns the reference with the ID
    const docRef = await db.collection("rounds").add({
      name,
      status: status || "UPCOMING",
      order: order || 0,
      createdAt: new Date(),
    });

    clearCache();

    // Construct the response object
    const newRound = {
      id: docRef.id,
      name,
      status: status || "UPCOMING",
      order: order || 0,
    };

    return NextResponse.json({ round: newRound }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create round" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, status, name, order } = await req.json();

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (name !== undefined) updateData.name = name;
    if (order !== undefined) updateData.order = order;
    updateData.updatedAt = new Date();

    const roundRef = db.collection("rounds").doc(id);
    await roundRef.update(updateData);

    clearCache();

    // Fetch updated doc to return
    const docSnap = await roundRef.get();
    return NextResponse.json({ round: { id: docSnap.id, ...docSnap.data() } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update round" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await req.json();

    await db.collection("rounds").doc(id).delete();

    clearCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete round" }, { status: 500 });
  }
}
