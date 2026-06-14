import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";
import { getCache, setCache, clearCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const cacheKey = `admin-rounds-${Math.floor(Date.now() / 60_000)}`;
    const cached = getCache<any>(cacheKey, 60_000);
    if (cached) return NextResponse.json({ rounds: cached });

    const roundsSnap = await db.collection("rounds").orderBy("order", "asc").get();
    const matchesSnap = await db.collection("matches").orderBy("order", "asc").get();

    const matchesMap = new Map<string, any[]>();
    matchesSnap.docs.forEach((doc) => {
      const d = { id: doc.id, ...doc.data() } as any;
      if (!matchesMap.has(d.roundId)) matchesMap.set(d.roundId, []);
      matchesMap.get(d.roundId)!.push(d);
    });

    const rounds = roundsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      matches: matchesMap.get(doc.id) || [],
    }));

    setCache(cacheKey, rounds, 60_000);
    return NextResponse.json({ rounds });
  } catch (err: any) {
    console.error("Admin rounds error:", err?.message || err);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, status, order } = await req.json();

    const ref = db.collection("rounds").doc();
    await ref.set({ name, status: status || "UPCOMING", order: order || 0, createdAt: new Date() });

    clearCache();

    const doc = await ref.get();
    return NextResponse.json({ round: { id: doc.id, ...doc.data() } });
  } catch (err: any) {
    console.error("Create round error:", err?.message || err);
    return NextResponse.json({ error: "Failed to create round" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, status, name, order } = await req.json();

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (name !== undefined) updateData.name = name;
    if (order !== undefined) updateData.order = order;
    updateData.updatedAt = new Date();

    await db.collection("rounds").doc(id).update(updateData);

    clearCache();

    const doc = await db.collection("rounds").doc(id).get();
    return NextResponse.json({ round: { id: doc.id, ...doc.data() } });
  } catch (err: any) {
    console.error("Update round error:", err?.message || err);
    return NextResponse.json({ error: "Failed to update round" }, { status: 500 });
  }
}
