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

    const { data: rounds } = await supabase
      .from("rounds")
      .select("*")
      .order("order_num", { ascending: true });

    const { data: matches } = await supabase
      .from("matches")
      .select("*")
      .order("order_num", { ascending: true });

    const matchesMap = new Map<string, any[]>();
    (matches || []).forEach((m: any) => {
      if (!matchesMap.has(m.round_id)) matchesMap.set(m.round_id, []);
      matchesMap.get(m.round_id)!.push(m);
    });

    const roundsWithMatches = (rounds || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      order: r.order_num || 0,
      matches: (matchesMap.get(r.id) || []).map((m: any) => ({
        id: m.id,
        homeTeam: m.home_team,
        awayTeam: m.away_team,
        matchDate: m.match_date,
        homeScore: m.home_score ?? null,
        awayScore: m.away_score ?? null,
        isLive: m.is_live ?? false,
        order: m.order_num || 0,
        roundId: m.round_id,
      })),
    }));

    setCache(cacheKey, roundsWithMatches, 60_000);
    return NextResponse.json({ rounds: roundsWithMatches });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, status, order } = await req.json();

    const { data: round, error } = await supabase
      .from("rounds")
      .insert({ name, status: status || "UPCOMING", order_num: order || 0 })
      .select()
      .single();

    if (error || !round) {
      return NextResponse.json({ error: "Failed to create round" }, { status: 500 });
    }

    clearCache();
    return NextResponse.json({ round });
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
    if (order !== undefined) updateData.order_num = order;

    const { data: round, error } = await supabase
      .from("rounds")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error || !round) {
      return NextResponse.json({ error: "Failed to update round" }, { status: 500 });
    }

    clearCache();
    return NextResponse.json({ round });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update round" }, { status: 500 });
  }
}
