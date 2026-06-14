"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  Shield,
  Plus,
  Trash2,
  Save,
  Play,
  CheckCircle,
  Unlock,
  Loader2,
  Calendar,
  Pencil,
} from "lucide-react";

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

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      ...(options?.headers || {}),
      "Content-Type": "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [newRoundName, setNewRoundName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newMatch, setNewMatch] = useState<
    Record<string, { homeTeam: string; awayTeam: string; matchDate: string }>
  >({});
  const [scoreInputs, setScoreInputs] = useState<
    Record<string, { home: string; away: string }>
  >({});
  const [matchInputs, setMatchInputs] = useState<
    Record<string, { homeTeam: string; awayTeam: string; matchDate: string }>
  >({});
  const [error, setError] = useState("");

  const fetchRounds = useCallback(async () => {
    try {
      setError("");
      const data = await fetchJSON("/api/admin/rounds");
      setRounds(data.rounds || []);
      // seed score inputs
      setScoreInputs((prev) => {
        const init = { ...prev };
        (data.rounds || []).forEach((r: Round) => {
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
      // seed match detail inputs
      setMatchInputs((prev) => {
        const init = { ...prev };
        (data.rounds || []).forEach((r: Round) => {
          r.matches.forEach((m) => {
            if (!(m.id in init)) {
              init[m.id] = {
                homeTeam: m.homeTeam,
                awayTeam: m.awayTeam,
                matchDate: m.matchDate ? new Date(m.matchDate).toISOString().slice(0, 16) : "",
              };
            }
          });
        });
        return init;
      });
    } catch (err: any) {
      console.error("fetchRounds error:", err);
      setError(err.message || "Failed to load rounds");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user?.isAdmin) fetchRounds();
  }, [user, fetchRounds]);

  const createRound = async () => {
    if (!newRoundName.trim()) return;
    try {
      setCreating(true);
      setError("");
      await fetchJSON("/api/admin/rounds", {
        method: "POST",
        body: JSON.stringify({ name: newRoundName.trim(), order: rounds.length }),
      });
      setNewRoundName("");
      await fetchRounds();
      alert("Round created!");
    } catch (err: any) {
      console.error("createRound error:", err);
      setError(err.message || "Failed to create round");
      alert("Error creating round: " + (err.message || "Unknown error"));
    } finally {
      setCreating(false);
    }
  };

  const updateRoundStatus = async (id: string, status: string) => {
    try {
      setError("");
      await fetchJSON("/api/admin/rounds", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      await fetchRounds();
    } catch (err: any) {
      console.error("updateRoundStatus error:", err);
      alert("Error: " + (err.message || "Unknown error"));
    }
  };

  const addMatch = async (roundId: string) => {
    const m = newMatch[roundId];
    if (!m?.homeTeam?.trim() || !m?.awayTeam?.trim()) {
      alert("Please enter both home and away teams");
      return;
    }
    try {
      setError("");
      await fetchJSON("/api/admin/matches", {
        method: "POST",
        body: JSON.stringify({
          roundId,
          homeTeam: m.homeTeam.trim(),
          awayTeam: m.awayTeam.trim(),
          matchDate: m.matchDate || new Date().toISOString(),
          order: 0,
        }),
      });
      setNewMatch((prev) => ({
        ...prev,
        [roundId]: { homeTeam: "", awayTeam: "", matchDate: "" },
      }));
      await fetchRounds();
    } catch (err: any) {
      console.error("addMatch error:", err);
      alert("Error adding match: " + (err.message || "Unknown error"));
    }
  };

  const updateMatch = async (matchId: string) => {
    const m = matchInputs[matchId];
    if (!m) return;
    try {
      setError("");
      await fetchJSON("/api/admin/matches", {
        method: "PATCH",
        body: JSON.stringify({
          id: matchId,
          homeTeam: m.homeTeam?.trim(),
          awayTeam: m.awayTeam?.trim(),
          matchDate: m.matchDate || null,
        }),
      });
      await fetchRounds();
      alert("Match details updated!");
    } catch (err: any) {
      console.error("updateMatch error:", err);
      alert("Error updating match: " + (err.message || "Unknown error"));
    }
  };

  const updateScore = async (matchId: string) => {
    const homeScore = scoreInputs[matchId]?.home ?? "";
    const awayScore = scoreInputs[matchId]?.away ?? "";
    try {
      setError("");
      await fetchJSON("/api/admin/scores", {
        method: "PATCH",
        body: JSON.stringify({
          id: matchId,
          homeScore: homeScore === "" ? null : Number(homeScore),
          awayScore: awayScore === "" ? null : Number(awayScore),
        }),
      });
      await fetchRounds();
      alert("Score updated!");
    } catch (err: any) {
      console.error("updateScore error:", err);
      alert("Error updating score: " + (err.message || "Unknown error"));
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!confirm("Delete this match?")) return;
    try {
      setError("");
      await fetchJSON("/api/admin/matches", {
        method: "DELETE",
        body: JSON.stringify({ id: matchId }),
      });
      await fetchRounds();
    } catch (err: any) {
      console.error("deleteMatch error:", err);
      alert("Error deleting match: " + (err.message || "Unknown error"));
    }
  };

  if (loading || loadingData)
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-white/50 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading...
      </div>
    );
  if (!user?.isAdmin)
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-wc-red">Forbidden</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Shield className="w-8 h-8 text-wc-red" />
        Admin Panel
      </h1>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-wc-red/10 border border-wc-red/30 text-wc-red text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10">
        <h2 className="text-lg font-bold mb-4">Create Match Week</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newRoundName}
            onChange={(e) => setNewRoundName(e.target.value)}
            placeholder="e.g., Group Stage - Matchday 1"
            className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && createRound()}
          />
          <button
            onClick={createRound}
            disabled={creating}
            className="px-6 py-3 rounded-lg bg-wc-gold text-wc-dark font-bold hover:bg-wc-gold/90 transition disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Create
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
              {round.matches.map((match) => {
                const m = matchInputs[match.id] || {
                  homeTeam: match.homeTeam,
                  awayTeam: match.awayTeam,
                  matchDate: match.matchDate ? new Date(match.matchDate).toISOString().slice(0, 16) : "",
                };

                return (
                  <div key={match.id} className="px-6 py-4">
                    {/* Match Details Row */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-3">
                      <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={m.homeTeam}
                          onChange={(e) =>
                            setMatchInputs((prev) => ({
                              ...prev,
                              [match.id]: { ...prev[match.id], homeTeam: e.target.value },
                            }))
                          }
                          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm font-semibold"
                          placeholder="Home Team"
                        />
                        <div className="flex items-center justify-center px-2 text-white/20 text-sm font-bold">VS</div>
                        <input
                          type="text"
                          value={m.awayTeam}
                          onChange={(e) =>
                            setMatchInputs((prev) => ({
                              ...prev,
                              [match.id]: { ...prev[match.id], awayTeam: e.target.value },
                            }))
                          }
                          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm font-semibold"
                          placeholder="Away Team"
                        />
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-white/20" />
                          <input
                            type="datetime-local"
                            value={m.matchDate}
                            onChange={(e) =>
                              setMatchInputs((prev) => ({
                                ...prev,
                                [match.id]: { ...prev[match.id], matchDate: e.target.value },
                              }))
                            }
                            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm"
                          />
                          <button
                            onClick={() => updateMatch(match.id)}
                            className="p-2 rounded-lg bg-wc-blue/10 text-wc-blue hover:bg-wc-blue/20 transition border border-wc-blue/20"
                            title="Update match details"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Score & Delete */}
                      <div className="flex items-center gap-2 shrink-0">
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
                        <button
                          onClick={() => updateScore(match.id)}
                          className="p-2 rounded-lg bg-wc-gold/20 text-wc-gold hover:bg-wc-gold/30 transition"
                          title="Update score"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMatch(match.id)}
                          className="p-2 rounded-lg text-wc-red hover:bg-wc-red/10 transition"
                          title="Delete match"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="px-6 py-4 bg-white/5 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Home Team"
                  value={newMatch[round.id]?.homeTeam || ""}
                  onChange={(e) =>
                    setNewMatch((prev) => ({
                      ...prev,
                      [round.id]: {
                        ...prev[round.id],
                        homeTeam: e.target.value,
                        awayTeam: prev[round.id]?.awayTeam || "",
                        matchDate: prev[round.id]?.matchDate || "",
                      },
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
                      [round.id]: {
                        ...prev[round.id],
                        awayTeam: e.target.value,
                        homeTeam: prev[round.id]?.homeTeam || "",
                        matchDate: prev[round.id]?.matchDate || "",
                      },
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
                      [round.id]: {
                        ...prev[round.id],
                        matchDate: e.target.value,
                        homeTeam: prev[round.id]?.homeTeam || "",
                        awayTeam: prev[round.id]?.awayTeam || "",
                      },
                    }))
                  }
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm"
                />
                <button
                  onClick={() => addMatch(round.id)}
                  className="px-4 py-2 rounded-lg bg-wc-gold text-wc-dark font-bold hover:bg-wc-gold/90 transition text-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {rounds.length === 0 && !loadingData && (
          <div className="text-center text-white/30 py-12">
            No rounds yet. Create one above!
          </div>
        )}
      </div>
    </div>
  );
}
