"use client";

import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase-client";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";

// Define types as 'any' to handle Firestore flexibility safely
type Match = any;
type Prediction = any;
type Round = any;

// --- Point Calculation Logic ---
function calculatePoints(pred: any, match: any): number | null {
  // If match score is missing, points cannot be calculated yet -> null (Pending)
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
  const auth = useAuth();
  // FIX: Cast to 'any' to bypass strict 'User' type checking
  const authUser = auth?.user as any;
  const authLoading = auth?.loading;

  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [doublePicks, setDoublePicks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  // Setup Real-time Listeners
  useEffect(() => {
    if (!db) return;

    const qMatches = query(collection(db, "matches"), orderBy("order", "asc"));
    const qPredictions = query(collection(db, "predictions"));
    const qDoublePicks = query(collection(db, "double_picks"));
    const qUsers = query(collection(db, "users"));
    const qRounds = query(collection(db, "rounds"), orderBy("order", "asc"));

    const unsubR = [
      onSnapshot(qMatches, (snap) => setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(qPredictions, (snap) => setPredictions(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(qDoublePicks, (snap) => setDoublePicks(snap.docs.map(d => d.data()))),
      onSnapshot(qUsers, (snap) => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(qRounds, (snap) => setRounds(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];

    setLoading(false);
    return () => unsubR.forEach(u => u());
  }, []);

  // 1. Compute Leaderboard (Derived State)
  const leaderboard = useMemo(() => {
    if (matches.length === 0) return [];

    const userScores: Record<string, any> = {};
    users.forEach(u => {
      userScores[u.id] = { id: u.id, username: u.username, totalPoints: 0, predictionsCount: 0 };
    });

    predictions.forEach(pred => {
      const userId = pred.user_id || pred.userId;
      const matchId = pred.match_id || pred.matchId;
      
      if (!userId || !matchId) return;
      const match = matches.find(m => m.id === matchId);
      if (!match) return;
      const user = userScores[userId];
      if (!user) return;

      user.predictionsCount++;
      
      const base = calculatePoints(pred, match);
      if (base !== null) {
        const isDoubled = doublePicks.some(d => {
           const dMatchId = d.match_id || d.matchId;
           const dUserId = d.user_id || d.userId;
           return dMatchId === matchId && dUserId === userId;
        });
        user.totalPoints += base * (isDoubled ? 2 : 1);
      }
      const userData = users.find(u => u.id === userId);
      if (userData?.bonusPoints) user.totalPoints += userData.bonusPoints;
    });

    return Object.values(userScores).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [matches, predictions, doublePicks, users]);

  // 2. Compute Current User's View (Derived State)
  const myRounds = useMemo(() => {
    // FIX: Access ID safely using 'any' cast
    const currentUserId = authUser?.id || authUser?.userId;

    if (!currentUserId || matches.length === 0) return [];

    const myPreds = predictions.filter(p => (p.user_id === currentUserId || p.userId === currentUserId));
    const predMap = new Map();
    myPreds.forEach(p => predMap.set(p.match_id || p.matchId, p));

    const myDoubles = doublePicks.filter(d => (d.user_id === currentUserId || d.userId === currentUserId));
    const doubleSet = new Set(myDoubles.map(d => d.match_id || d.matchId));

    return rounds.map((round: any) => ({
      id: round.id,
      name: round.name,
      status: round.status,
      matches: matches
        .filter(m => (m.round_id || m.roundId) === round.id)
        .map((match: any) => {
          const pred = predMap.get(match.id);
          const isDoubled = doubleSet.has(match.id);
          
          let points = null;
          if (pred) {
             points = calculatePoints(pred, match);
             if (points !== null && isDoubled) points *= 2;
          }

          return {
            id: match.id,
            homeTeam: match.home_team || match.homeTeam,
            awayTeam: match.away_team || match.awayTeam,
            matchDate: match.match_date || match.matchDate,
            homeScore: match.home_score ?? null,
            awayScore: match.away_score ?? null,
            isLive: match.is_live ?? false,
            prediction: pred ? { homeScore: pred.home_score, awayScore: pred.away_score } : null,
            doublePick: isDoubled,
            points // null = pending
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
