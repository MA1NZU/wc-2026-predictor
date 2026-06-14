"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Swords, Lock, Star, Save, Trophy } from "lucide-react";

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  homeScore: number | null;
  awayScore: number | null;
  prediction: { homeScore: number; awayScore: number } | null;
  doublePick: boolean;
  points: number | null;
};

type Round = {
  id: string;
  name: string;
  status: string;
  matches: Match[];
};

export default function PredictPage() {
  const { user, loading } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string }>>({});

  const fetchRounds = async () => {
    const res = await fetch("/api/rounds");
    if (res.ok) {
      const data = await res.json();
      setRounds(data.rounds);
      setInputs((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const init: Record<string, { home: string; away: string }> = {};
        data.rounds.forEach((r: Round) => {
          r.matches.forEach((m) => {
            if (m.prediction) {
              init[m.id] = {
                home: String(m.prediction.homeScore),
                away: String(m.prediction.awayScore),
              };
            }
          });
        });
        return init;
      });
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchRounds();
    const interval = setInterval(fetchRounds, 10000);
    return () => clearInterval(interval);
  }, []);

  const savePrediction = async (matchId: string) => {
    const inp = inputs[matchId];
    if (!inp || inp.home === "" || inp.away === "") return;

    setSaving((s) => ({ ...s, [matchId]: true }));
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId,
        homeScore: Number(inp.home),
        awayScore: Number(inp.away),
      }),
    });
    setSaving((s) => ({ ...s, [matchId]: false }));

    if (res.ok) {
      fetchRounds();
    } else {
      alert("Failed to save prediction");
    }
  };

  const setDoublePick = async (roundId: string, matchId: string) => {
    const res = await fetch("/api/double-pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId, matchId }),
    });
    if (res.ok) {
      fetchRounds();
    } else {
      alert("Failed to set double pick");
    }
  };

  if (loading || loadingData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-white/50">
        Loading matches...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-white/70">
          Please <a href="/login" className="text-wc-gold underline">sign in</a> to make predictions.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Swords className="w-8 h-8 text-wc-gold" />
        Your Predictions
      </h1>

      <div className="space-y-8">
        {rounds.map((round) => (
          <div key={round.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold">{round.name}</h2>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  round.status === "LIVE"
                    ? "bg-wc-red/20 text-wc-red animate-pulse"
                    : round.status === "FINISHED"
                    ? "bg-wc-blue/20 text-wc-blue"
                    : "bg-green-500/20 text-green-400"
                }`}>
                  {round.status}
                </span>
                {round.status === "LIVE" && (
                  <span className="text-xs text-wc-red font-semibold">LIVE SCORING</span>
                )}
                {(round.status === "LIVE" || round.status === "FINISHED") && (
                  <Lock className="w-4 h-4 text-white/50" />
                )}
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {round.matches.map((match) => {
                const inp = inputs[match.id] || { home: "", away: "" };
                const isLocked = round.status === "LIVE" || round.status === "FINISHED";

                return (
                  <div key={match.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                      <div className="text-right font-semibold text-lg">{match.homeTeam}</div>
                      <div className="text-white/30 text-sm">vs</div>
                      <div className="text-left font-semibold text-lg">{match.awayTeam}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isLocked ? (
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-white/50">
                            {match.prediction ? (
                              <span>
                                You predicted:{" "}
                                <span className="text-wc-gold font-bold">
                                  {match.prediction.homeScore} - {match.prediction.awayScore}
                                </span>
                              </span>
                            ) : (
                              <span>No prediction</span>
                            )}
                          </div>
                          {match.points !== null && (
                            <div className={`px-3 py-1 rounded-lg text-sm font-bold ${
                              match.points > 0 ? "bg-wc-gold/20 text-wc-gold" : "bg-white/5 text-white/30"
                            }`}>
                              {match.points} pts
                              {match.doublePick && <span className="ml-1 text-wc-red">(2x)</span>}
                            </div>
                          )}
                          {match.doublePick && <Star className="w-4 h-4 text-wc-gold fill-wc-gold" />}
                          {match.points === 6 && <Trophy className="w-4 h-4 text-wc-gold" />}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              value={inp.home}
                              onChange={(e) =>
                                setInputs({ ...inputs, [match.id]: { ...inp, home: e.target.value } })
                              }
                              placeholder="0"
                              className="w-14 text-center px-2 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none"
                            />
                            <span className="text-white/30">-</span>
                            <input
                              type="number"
                              min={0}
                              value={inp.away}
                              onChange={(e) =>
                                setInputs({ ...inputs, [match.id]: { ...inp, away: e.target.value } })
                              }
                              placeholder="0"
                              className="w-14 text-center px-2 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none"
                            />
                            <button
                              onClick={() => savePrediction(match.id)}
                              disabled={saving[match.id]}
                              className="p-2 rounded-lg bg-wc-gold text-wc-dark hover:bg-wc-gold/90 transition disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => setDoublePick(round.id, match.id)}
                            className={`p-2 rounded-lg transition ${
                              match.doublePick
                                ? "bg-wc-gold/20 text-wc-gold"
                                : "bg-white/5 text-white/30 hover:text-white"
                            }`}
                            title="Double points for this match"
                          >
                            <Star className={`w-4 h-4 ${match.doublePick ? "fill-wc-gold" : ""}`} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {round.matches.length === 0 && (
                <div className="px-6 py-8 text-center text-white/30 text-sm">
                  No matches in this round yet.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
