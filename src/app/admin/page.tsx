"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Shield, Plus, Trash2, Save, Play, CheckCircle, Unlock } from "lucide-react";

type Round = {
  id: string;
  name: string;
  status: string;
  order: number;
  matches: Match[];
};

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  homeScore: number | null;
  awayScore: number | null;
  order: number;
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [newRoundName, setNewRoundName] = useState("");
  const [newMatch, setNewMatch] = useState<Record<string, { homeTeam: string; awayTeam: string; matchDate: string }>>({});
  const [scoreInputs, setScoreInputs] = useState<Record<string, { home: string; away: string }>>({});

  const fetchRounds = async () => {
    const res = await fetch("/api/admin/rounds");
    if (res.ok) {
      const data = await res.json();
      setRounds(data.rounds);
    }
    setLoadingData(false);
  };

  useEffect(() => {
    if (user?.isAdmin) fetchRounds();
  }, [user]);

  useEffect(() => {
    setScoreInputs((prev) => {
      const init = { ...prev };
      rounds.forEach((r) => {
        r.matches.forEach((m) => {
          if (!(m.id in init)) {
            init[m.id] = {
              home: m.homeScore !== null ? String(m.homeScore) : "",
              away: m.awayScore !== null ? String(m.awayScore) : "",
            };
          }
        });
      });
      return init;
    });
  }, [rounds]);

  const createRound = async () => {
    if (!newRoundName.trim()) return;
    const res = await fetch("/api/admin/rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRoundName, order: rounds.length }),
    });
    if (res.ok) {
      setNewRoundName("");
      fetchRounds();
    }
  };

  const updateRoundStatus = async (id: string, status: string) => {
    const res = await fetch("/api/admin/rounds", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) fetchRounds();
  };

  const addMatch = async (roundId: string) => {
    const m = newMatch[roundId];
    if (!m?.homeTeam || !m?.awayTeam) return;

    const res = await fetch("/api/admin/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roundId,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        matchDate: m.matchDate || new Date().toISOString(),
        order: 0,
      }),
    });
    if (res.ok) {
      setNewMatch((prev) => ({
        ...prev,
        [roundId]: { homeTeam: "", awayTeam: "", matchDate: "" },
      }));
      fetchRounds();
    }
  };

  const updateScore = async (matchId: string) => {
    const homeScore = scoreInputs[matchId]?.home ?? "";
    const awayScore = scoreInputs[matchId]?.away ?? "";

    const res = await fetch("/api/admin/scores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: matchId,
        homeScore: homeScore === "" ? null : Number(homeScore),
        awayScore: awayScore === "" ? null : Number(awayScore),
      }),
    });
    if (res.ok) fetchRounds();
  };

  const deleteMatch = async (matchId: string) => {
    if (!confirm("Delete this match?")) return;
    const res = await fetch("/api/admin/matches", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: matchId }),
    });
    if (res.ok) fetchRounds();
  };

  if (loading || loadingData)
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-white/50">Loading...</div>;
  if (!user?.isAdmin)
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-wc-red">Forbidden</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Shield className="w-8 h-8 text-wc-red" />
        Admin Panel
      </h1>

      <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10">
        <h2 className="text-lg font-bold mb-4">Create Match Week</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newRoundName}
            onChange={(e) => setNewRoundName(e.target.value)}
            placeholder="e.g., Group Stage - Matchday 1"
            className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none"
          />
          <button onClick={createRound} className="px-6 py-3 rounded-lg bg-wc-gold text-wc-dark font-bold hover:bg-wc-gold/90 transition">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {rounds.map((round) => (
          <div key={round.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{round.name}</h2>
                <div className="text-sm text-white/50 mt-1">{round.matches.length} matches</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateRoundStatus(round.id, "OPEN")}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    round.status === "OPEN" ? "bg-green-500/20 text-green-400" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <Unlock className="w-3 h-3" /> OPEN
                </button>
                <button
                  onClick={() => updateRoundStatus(round.id, "LIVE")}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    round.status === "LIVE" ? "bg-wc-red/20 text-wc-red" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <Play className="w-3 h-3" /> LIVE
                </button>
                <button
                  onClick={() => updateRoundStatus(round.id, "FINISHED")}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    round.status === "FINISHED" ? "bg-wc-blue/20 text-wc-blue" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <CheckCircle className="w-3 h-3" /> FINISHED
                </button>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {round.matches.map((match) => (
                <div key={match.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div className="text-right font-semibold">{match.homeTeam}</div>
                    <div className="text-white/30">vs</div>
                    <div className="text-left font-semibold">{match.awayTeam}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={scoreInputs[match.id]?.home ?? ""}
                      onChange={(e) =>
                        setScoreInputs((prev) => ({
                          ...prev,
                          [match.id]: { ...prev[match.id], home: e.target.value },
                        }))
                      }
                      placeholder="H"
                      className="w-16 text-center px-2 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none"
                    />
                    <span className="text-white/30">-</span>
                    <input
                      type="number"
                      min={0}
                      value={scoreInputs[match.id]?.away ?? ""}
                      onChange={(e) =>
                        setScoreInputs((prev) => ({
                          ...prev,
                          [match.id]: { ...prev[match.id], away: e.target.value },
                        }))
                      }
                      placeholder="A"
                      className="w-16 text-center px-2 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none"
                    />
                    <button onClick={() => updateScore(match.id)} className="p-2 rounded-lg bg-wc-gold/20 text-wc-gold hover:bg-wc-gold/30 transition">
                      <Save className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteMatch(match.id)} className="p-2 rounded-lg text-wc-red hover:bg-wc-red/10 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="px-6 py-4 bg-white/5 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Home Team"
                  value={newMatch[round.id]?.homeTeam || ""}
                  onChange={(e) =>
                    setNewMatch((prev) => ({
                      ...prev,
                      [round.id]: { ...prev[round.id], homeTeam: e.target.value, awayTeam: prev[round.id]?.awayTeam || "", matchDate: prev[round.id]?.matchDate || "" },
                    }))
                  }
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm"
                />
                <input
                  type="text"
                  placeholder="Away Team"
                  value={newMatch[round.id]?.awayTeam || ""}
                  onChange={(e) =>
                    setNewMatch((prev) => ({
                      ...prev,
                      [round.id]: { ...prev[round.id], awayTeam: e.target.value, homeTeam: prev[round.id]?.homeTeam || "", matchDate: prev[round.id]?.matchDate || "" },
                    }))
                  }
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm"
                />
                <input
                  type="datetime-local"
                  value={newMatch[round.id]?.matchDate || ""}
                  onChange={(e) =>
                    setNewMatch((prev) => ({
                      ...prev,
                      [round.id]: { ...prev[round.id], matchDate: e.target.value, homeTeam: prev[round.id]?.homeTeam || "", awayTeam: prev[round.id]?.awayTeam || "" },
                    }))
                  }
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm"
                />
                <button onClick={() => addMatch(round.id)} className="px-4 py-2 rounded-lg bg-wc-gold text-wc-dark font-bold hover:bg-wc-gold/90 transition text-sm">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
