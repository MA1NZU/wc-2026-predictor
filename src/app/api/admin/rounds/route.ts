import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";
import { getCache, setCache, clearCache } from "@/lib/cache";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const cacheKey = `admin-rounds-${Math.floor(Date.now() / 60_000)}`;
    const cached = getCache<any>(cacheKey, 60_000);

    if (cached) return NextResponse.json({ rounds: cached });

    // Fetch rounds
    const roundsQuery = query(collection(db, "rounds"), orderBy("order", "asc"));
    const roundsSnap = await getDocs(roundsQuery);

    // Fetch matches
    const matchesQuery = query(collection(db, "matches"), orderBy("order", "asc"));
    const matchesSnap = await getDocs(matchesQuery);

    const matchesMap = new Map<string, any[]>();
    matchesSnap.forEach((matchDoc) => {
      const data = matchDoc.data();
      // Adjust 'roundId' to match your actual field name (e.g., round_id)
      const roundId = data.roundId || data.round_id; 
      if (!matchesMap.has(roundId)) matchesMap.set(roundId, []);
      matchesMap.get(roundId)!.push({ id: matchDoc.id, ...data });
    });

    const rounds = roundsSnap.docs.map((roundDoc) => ({
      id: roundDoc.id,
      ...roundDoc.data(),
      matches: matchesMap.get(roundDoc.id) || [],
    }));

    setCache(cacheKey, rounds, 60_000);
    return NextResponse.json({ rounds });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch rounds" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, status, order } = await req.json();

    const newRound = await addDoc(collection(db, "rounds"), {
      name,
      status: status || "UPCOMING",
      order: order || 0,
      createdAt: serverTimestamp(),
    });

    clearCache();

    // Fetch the created doc to return it
    const docSnap = await getDoc(doc(db, "rounds", newRound.id));
    return NextResponse.json({ round: { id: docSnap.id, ...docSnap.data() } }, { status: 201 });
  } catch (error) {
    console.error(error);
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
    updateData.updatedAt = serverTimestamp();

    const roundRef = doc(db, "rounds", id);
    await updateDoc(roundRef, updateData);

    clearCache();

    const docSnap = await getDoc(roundRef);
    return NextResponse.json({ round: { id: docSnap.id, ...docSnap.data() } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update round" }, { status: 500 });
  }
}
