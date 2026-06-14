import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import { clearCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, homeScore, awayScore } = await req.json();

    const updateData: any = {};
    if (homeScore !== undefined) updateData.home_score = homeScore === null ? null : Number(homeScore);
    if (awayScore !== undefined) updateData.away_score = awayScore === null ? null : Number(awayScore);

    const { data: match, error } = await supabase
      .from("matches")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error || !match) {
      return NextResponse.json({ error: "Failed to update score" }, { status: 500 });
    }

    clearCache();
    return NextResponse.json({ match });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update score" }, { status: 500 });
  }
}
