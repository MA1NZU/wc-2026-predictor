"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, Loader2, Crown } from "lucide-react";

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
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
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
      <div className="max-w-3xl mx-auto px-4 py-24 flex flex-col items-center gap-4 text-white/50">
        <Loader2 className="w-10 h-10 animate-spin text-wc-gold" />
        <p className="text-lg">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-wc-gold/20 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-wc-gold" />
        </div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
      </div>

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
              className={`grid grid-cols-[auto_1fr_auto] gap-4 px-6 py-4 items-center transition ${index < 3 ? "hover:bg-white/5" : "hover:bg-white/[0.02]"}`}
            >
              <div className="flex items-center justify-center w-8">
                {index === 0 ? (
                  <Crown className="w-6 h-6 text-wc-gold" />
                ) : index === 1 ? (
                  <Medal className="w-6 h-6 text-gray-300" />
                ) : index === 2 ? (
                  <Medal className="w-6 h-6 text-amber-700" />
                ) : (
                  <span className="text-white/30 font-mono text-sm">{index + 1}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="font-semibold">{user.username}</div>
                {index === 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-wc-gold/20 text-wc-gold uppercase tracking-wider">#1</span>
                )}
              </div>
              <div className="text-right font-bold text-lg text-wc-gold">
                {user.totalPoints}
              </div>
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
