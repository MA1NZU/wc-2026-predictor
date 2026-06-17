"use client";

import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase-client";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";

type Match = any;
type Prediction = any;

// --- Point Calculation Logic ---
function calculatePoints(pred: any, match: any): number | null {
  if (match.home_score == null || match.away_score == null) return null;
  if (pred.home_score == null || pred.away_score == null) return null;

  if (pred.home_score === match.home_score && pred.away_score === match.away_score) return 6;

  const predOutcome =
    pred.home_score > pred.away_score ? "home" : pred.home_score < pred.away_score ? "away" : "draw";
  const actOutcome =
    match.home_score > match.away_score ? "home" : match.home_score < match.away_score ? "away" : "draw";

  if (predOutcome === actOutcome) return 3;
  return 0;
}

const GameContext = createContext<any>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, loading: authLoading } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [doublePicks, setDoublePicks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Setup Real-time Listeners
  useEffect(() => {
    if (!db) return;

    const unsubR = [
      // Initial sort by 'order', but we re-sort by date in the 'myRounds' useMemo below
      onSnapshot(query(collection(db, "matches"), orderBy("order", "asc")), (snap) =>
        setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(query(collection(db, "predictions")), (snap) =>
        setPredictions(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(query(collection(db, "double_picks")), (snap) =>
        setDoublePicks(snap.docs.map((d) => d.data()))
      ),
      onSnapshot(query(collection(db, "users")), (snap) =>
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(query(collection(db, "rounds"), orderBy("order", "asc")), (snap) =>
        setRounds(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    ];

    setLoading(false);
    return () => unsubR.forEach((u) => u());
  }, []);

  // 2. Compute Current User's View (Sorted by Date)
  const myRounds = useMemo(() => {
    const u = authUser as any;
    const currentUserId = u?.id || u?.userId || u?.uid;

    if (!currentUserId || matches.length === 0) return [];

    // Filter predictions robustly
    const myPreds = predictions.filter((p) => {
      const pUid = p.user_id || p.userId;
      return String(pUid) === String(currentUserId);
    });

    const predMap = new Map();
    myPreds.forEach((p) => {
      const mId = p.match_id || p.matchId;
      if (mId) predMap.set(mId, p);
    });

    const myDoubles = doublePicks.filter((d) => String(d.user_id || d.userId) === String(currentUserId));
    const doubleSet = new Set(myDoubles.map((d) => d.match_id || d.matchId));

    return rounds.map((round: any) => {
      // 1. Filter matches for this round
      const roundMatches = matches.filter((m: any) => (m.round_id || m.roundId) === round.id);

      // 2. SORT matches by date/time (Chronological)
      roundMatches.sort((a: any, b: any) => {
        // Helper to safely parse Firestore Timestamps or Strings
        const parseDate = (raw: any) => {
          if (!raw) return 0;
          // If it's a Firestore Timestamp object, convert to Date
          const dateObj = raw.toDate ? raw.toDate() : new Date(raw);
          return dateObj.getTime();
        };

        const dateA = parseDate(a.match_date || a.matchDate);
        const dateB = parseDate(b.match_date || b.matchDate);

        if (isNaN(dateA)) return 1; // Invalid dates go to the end
        if (isNaN(dateB)) return -1;
        return dateA - dateB;
      });

      // 3. Map to final structure
      return {
        id: round.id,
        name: round.name,
        status: round.status,
        matches: roundMatches.map((match: any) => {
          const pred = predMap.get(match.id);
          const isDoubled = doubleSet.has(match.id);

          let points = null;
          if (pred) {
            points = calculatePoints(pred, match);
            if (points !== null && isDoubled) points *= 2;
          }

          // Ensure matchDate is a valid string or Date object for the UI
          const safeDate = match.match_date?.toDate ? match.match_date.toDate() : (match.match_date || match.matchDate);

          return {
            id: match.id,
            homeTeam: match.home_team || match.homeTeam || "TBD",
            awayTeam: match.away_team || match.awayTeam || "TBD",
            matchDate: safeDate, // The sorted date
            homeScore: match.home_score ?? null,
            awayScore: match.away_score ?? null,
            isLive: match.is_live ?? false,
            prediction: pred
              ? { homeScore: pred.home_score, awayScore: pred.away_score }
              : null,
            doublePick: isDoubled,
            points,
          };
        }),
      };
    });
  }, [matches, predictions, doublePicks, rounds, authUser]);

  // 3. Compute Leaderboard
  const leaderboard = useMemo(() => {
    if (matches.length === 0) return [];
    const userScores: Record<string, any> = {};
    users.forEach((u) => (userScores[u.id] = { id: u.id, username: u.username, totalPoints: 0, predictionsCount: 0 }));

    predictions.forEach((pred) => {
      const userId = pred.user_id || pred.userId;
      const matchId = pred.match_id || pred.matchId;
      if (!userId || !matchId) return;
      const match = matches.find((m) => m.id === matchId);
      if (!match || !userScores[userId]) return;

      userScores[userId].predictionsCount++;
      const base = calculatePoints(pred, match);
      if (base !== null) {
        const isDoubled = doublePicks.some(
          (d) => (d.match_id === matchId || d.matchId === matchId) && (d.user_id === userId || d.userId === userId)
        );
        userScores[userId].totalPoints += base * (isDoubled ? 2 : 1);
      }
      const uData = users.find((u) => u.id === userId);
      if (uData?.bonusPoints) userScores[userId].totalPoints += uData.bonusPoints;
    });
    return Object.values(userScores).sort((a: any, b: any) => b.totalPoints - a.totalPoints);
  }, [matches, predictions, doublePicks, users]);

  return (
    <GameContext.Provider value={{ leaderboard, myRounds, loading: loading || authLoading }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGameContext = () => useContext(GameContext);
