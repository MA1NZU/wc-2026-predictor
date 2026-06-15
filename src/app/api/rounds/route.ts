import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";
import { getCache, setCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

function calculatePoints(
  pred: { home_score: number; away_score: number },
  match: { home_score: number | null; away_score: number | null }
) {
  if (match.home_score === null || match.away_score === null) return null;
  if (pred.home_score === match.home_score && pred.away_score === match.away_score) return 6;

  const predOutcome = pred.home_score > pred.away_score ? "home" : pred.home_score < pred.away_score ? "away" : "draw";
  const actOutcome = match.home_score > match.away_score ? "home" : match.home_score < match.away_score ? "away" : "draw";

  if (predOutcome === actOutcome) return 3;
  return 0;
}

export async function GET() {
  try {
    const user = await getUser();

    const cacheKey = `rounds-data-${Math.floor(Date.now() / 60_000)}`;
    let cachedData = getCache<any>(cacheKey, 60_000);

    let roundsData, matchesData;
    if (cachedData) {
      roundsData = cachedData.rounds;
      matchesData = cachedData.matches;
    } else {
      const { data: rounds } = await supabase
        .from("rounds")
        .select("*")
        .order("order_num", { ascending: true });

      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .order("order_num", { ascending: true });

      roundsData = rounds || [];
      matchesData = matches || [];

      setCache(cacheKey, { rounds: roundsData, matches: matchesData }, 60_000);
    }

    const matchesMap = new Map<string, any>();
    matchesData.forEach((m: any) => matchesMap.set(m.id, m));

    let predictionsMap = new Map<string, any>();
    let doublePicksSet = new Set<string>();

    if (user) {
      const { data: predictions } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", user.userId);

      const { data: doublePicks } = await supabase
        .from("double_picks")
        .select("*")
        .eq("user_id", user.userId);

      (predictions || []).forEach((p: any) => predictionsMap.set(p.match_id, p));
      (doublePicks || []).forEach((d: any) => doublePicksSet.add(d.match_id));
    }

    const rounds = roundsData.map((round: any) => {
      const roundMatches = matchesData.filter((m: any) => m.round_id === round.id);

      return {
        id: round.id,
        name: round.name,
        status: round.status,
        order: round.order_num || 0,
        matches: roundMatches.map((match: any) => {
          const pred = predictionsMap.get(match.id) || null;
          const double = doublePicksSet.has(match.id);
          const basePoints = pred ? calculatePoints(pred, match) : null;
          const points = basePoints !== null ? (double ? basePoints * 2 : basePoints) : null;

          return {
            id: match.id,
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            matchDate: match.match_date,
            homeScore: match.home_score ?? null,
            awayScore: match.away_score ?? null,
            isLive: match.is_live ?? false,
            prediction: pred
              ? { homeScore: pred.home_score, awayScore: pred.away_score }
              : null,
            doublePick: double,
            points,
          };
        }),
      };
    });

    return NextResponse.json({ rounds });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ rounds: [] });
  }
}
