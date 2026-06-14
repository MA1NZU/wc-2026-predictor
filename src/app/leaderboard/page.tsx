"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal } from "lucide-react";

type LeaderboardUser = {
  id: string;
  username: string;
  totalPoints: number;
  predictionsCount: number;
};

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.leaderboard);
      }
      setLoading(false);
    };
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-white/50">
        Loading leaderboard...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Trophy className="w-8 h-8 text-wc-gold" />
        Leaderboard
      </h1>

      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-6 py-3 bg-white/5 text-sm font-bold text-white/50 uppercase tracking-wider">
          <div>Rank</div>
          <div>Player</div>
          <div className="text-right">Points</div>
        </div>
        <div className="divide-y divide-white/5">
          {users.map((user, index) => (
            <div
              key={user.id}
              className={`grid grid-cols-[auto_1fr_auto] gap-4 px-6 py-4 items-center ${
                index === 0 ? "bg-wc-gold/10" : index === 1 ? "bg-white/5" : index === 2 ? "bg-wc-blue/10" : ""
              }`}
            >
              <div className="flex items-center justify-center w-8">
                {index === 0 ? (
                  <Medal className="w-6 h-6 text-wc-gold" />
                ) : index === 1 ? (
                  <Medal className="w-6 h-6 text-gray-300" />
                ) : index === 2 ? (
                  <Medal className="w-6 h-6 text-amber-700" />
                ) : (
                  <span className="text-white/30 font-mono">{index + 1}</span>
                )}
              </div>
              <div className="font-semibold">{user.username}</div>
              <div className="text-right font-bold text-lg text-wc-gold">{user.totalPoints}</div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="px-6 py-12 text-center text-white/30">
              No players yet. Be the first to predict!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
