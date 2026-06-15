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

    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        round_id: roundId,
        home_team: homeTeam,
        away_team: awayTeam,
        match_date: matchDate || new Date().toISOString(),
        order_num: order || 0,
        is_live: false,
      })
      .select()
      .single();

    if (error || !match) {
      return NextResponse.json({ error: "Failed to create match" }, { status: 500 });
    }

    clearCache();
    return NextResponse.json({ match });
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

    const { data: match, error } = await supabase
      .from("matches")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error || !match) {
      return NextResponse.json({ error: "Failed to update match" }, { status: 500 });
    }

    clearCache();
    return NextResponse.json({ match });
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

    await supabase.from("matches").delete().eq("id", id);

    clearCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete match" }, { status: 500 });
  }
}
