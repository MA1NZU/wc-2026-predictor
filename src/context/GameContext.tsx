"use client";
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase-client";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";

type Match = any;
type Prediction = any;

function calculatePoints(pred: any, match: any): number | null {
  if (match.home_score == null || match.away_score == null) return null;
  if (pred.home_score == null || pred.away_score == null) return null;
  if (pred.home_score === match.home_score && pred.away_score === match.away_score) return 6;

  const predOutcome = pred.home_score > pred.away_score ? "home" : pred.home_score < pred.away_score ? "away" : "draw";
  const actOutcome = match.home_score > match.away_score ? "home" : match.home_score < match.away_score ? "away" : "draw";
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

  useEffect(() => {
    if (!db) return;
    const unsubR = [
      onSnapshot(query(collection(db, "matches"), orderBy("order", "asc")), (snap) => setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, "predictions")), (snap) => {
        const preds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log(`📦 [GameContext] Loaded ${preds.length} total predictions`);
        setPredictions(preds);
      }),
      onSnapshot(query(collection(db, "double_picks")), (snap) => setDoublePicks(snap.docs.map(d => d.data()))),
      onSnapshot(query(collection(db, "users")), (snap) => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, "rounds"), orderBy("order", "asc")), (snap) => setRounds(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    setLoading(false);
    return () => unsubR.forEach(u => u());
  }, []);

  const leaderboard = useMemo(() => {
    if (matches.length === 0) return [];
    const userScores: Record<string, any> = {};
    users.forEach(u => userScores[u.id] = { id: u.id, username: u.username, totalPoints: 0, predictionsCount: 0 });

    predictions.forEach(pred => {
      const userId = pred.user_id || pred.userId;
      const matchId = pred.match_id || pred.matchId;
      if (!userId || !matchId) return;
      const match = matches.find(m => m.id === matchId);
      if (!match || !userScores[userId]) return;

      userScores[userId].predictionsCount++;
      const base = calculatePoints(pred, match);
      if (base !== null) {
        const isDoubled = doublePicks.some(d => (d.match_id === matchId || d.matchId === matchId) && (d.user_id === userId || d.userId === userId));
        userScores[userId].totalPoints += base * (isDoubled ? 2 : 1);
      }
      const uData = users.find(u => u.id === userId);
      if (uData?.bonusPoints) userScores[userId].totalPoints += uData.bonusPoints;
    });
    return Object.values(userScores).sort((a: any, b: any) => b.totalPoints - a.totalPoints);
  }, [matches, predictions, doublePicks, users]);

  const myRounds = useMemo(() => {
    const u = authUser as any;
    const currentUserId = u?.id || u?.userId;
    if (!currentUserId || matches.length === 0) return [];

    const myPreds = predictions.filter(p => (p.user_id || p.userId) === currentUserId);
    console.log(`🎯 [GameContext] Found ${myPreds.length} predictions for user ${currentUserId}`);

    const predMap = new Map();
    myPreds.forEach(p => {
      const mId = p.match_id || p.matchId;
      if (mId) predMap.set(mId, p);
    });

    const myDoubles = doublePicks.filter(d => (d.user_id || d.userId) === currentUserId);
    const doubleSet = new Set(myDoubles.map(d => d.match_id || d.matchId));

    return rounds.map((round: any) => ({
      id: round.id,
      name: round.name,
      status: round.status,
      matches: matches
        .filter(m => (m.round_id || m.roundId) === round.id)
        .map(match => {
          const pred = predMap.get(match.id);
          const isDoubled = doubleSet.has(match.id);
          let points = null;
          if (pred) {
             points = calculatePoints(pred, match);
             if (points !== null && isDoubled) points *= 2;
          }
          return {
            id: match.id,
            homeTeam: match.home_team || match.homeTeam || "TBD",
            awayTeam: match.away_team || match.awayTeam || "TBD",
            matchDate: match.match_date || match.matchDate,
            homeScore: match.home_score ?? null,
            awayScore: match.away_score ?? null,
            isLive: match.is_live ?? false,
            prediction: pred ? { homeScore: pred.home_score, awayScore: pred.away_score } : null,
            doublePick: isDoubled,
            points
          };
        })
    }));
  }, [matches, predictions, doublePicks, rounds, authUser]);

  return (
    <GameContext.Provider value={{ leaderboard, myRounds, loading: loading || authLoading }}>
      {children}
    </GameContext.Provider>
  );
}
export const useGameContext = () => useContext(GameContext);
