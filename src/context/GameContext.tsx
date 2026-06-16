"use client";
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase-client"; 
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";

// Types
type Match = any; 
type Prediction = any;

// --- Point Calculation Logic ---
// FIX: Returns null for pending matches so UI shows "Pending" instead of "Missed"
function calculatePoints(
  pred: { home_score?: number; away_score?: number },
  match: { home_score?: number | null; away_score?: number | null }
) {
  // If match score is missing, points cannot be calculated yet
  if (match.home_score == null || match.away_score == null) return null;
  if (pred.home_score == null || pred.away_score == null) return null;

  // Exact score match = 6 pts
  if (pred.home_score === match.home_score && pred.away_score === match.away_score) return 6;

  const predOutcome =
    pred.home_score > pred.away_score
      ? "home"
      : pred.home_score < pred.away_score
      ? "away"
      : "draw";

  const actOutcome =
    match.home_score > match.away_score
      ? "home"
      : match.home_score < match.away_score
      ? "away"
      : "draw";

  // Correct winner/draw = 3 pts
  if (predOutcome === actOutcome) return 3;
  
  // Wrong outcome = 0 pts (This is a real Miss)
  return 0; 
}

const GameContext = createContext<any>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  // Use 'authUser' to access the logged-in user
  const { user: authUser, loading: authLoading } = useAuth();
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [doublePicks, setDoublePicks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Setup Real-time Listeners
  useEffect(() => {
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

  // 2. Compute Leaderboard (Derived State)
  const leaderboard = useMemo(() => {
    if (matches.length === 0) return [];

    const userScores: Record<string, { id: string, username: string, totalPoints: number, predictionsCount: number }> = {};

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
        const isDoubled = doublePicks.some(d => (d.match_id === matchId || d.matchId === matchId) && (d.user_id === userId || d.userId === userId));
        user.totalPoints += base * (isDoubled ? 2 : 1);
      }
      const userData = users.find(u => u.id === userId);
      if (userData?.bonusPoints) user.totalPoints += userData.bonusPoints;
    });

    return Object.values(userScores).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [matches, predictions, doublePicks, users]);

  // 3. Compute Current User's View (Derived State)
  const myRounds = useMemo(() => {
    // FIX: Use 'authUser?.id' instead of 'authUser?.userId' to match your API response
    if (!authUser?.id || matches.length === 0) return [];

    // Get my predictions
    const myPreds = predictions.filter(p => (p.user_id === authUser.id || p.userId === authUser.id));
    const predMap = new Map();
    myPreds.forEach(p => predMap.set(p.match_id || p.matchId, p));

    // Get my double picks
    const myDoubles = doublePicks.filter(d => (d.user_id === authUser.id || d.userId === authUser.id));
    const doubleSet = new Set(myDoubles.map(d => d.match_id || d.matchId));

    return rounds.map(round => ({
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
            homeTeam: match.home_team || match.homeTeam,
            awayTeam: match.away_team || match.awayTeam,
            matchDate: match.match_date || match.matchDate,
            homeScore: match.home_score ?? null,
            awayScore: match.away_score ?? null,
            isLive: match.is_live ?? false,
            prediction: pred ? { homeScore: pred.home_score, awayScore: pred.away_score } : null,
            doublePick: isDoubled,
            points // Will be null (Pending), 0 (Miss), or points
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
