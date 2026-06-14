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
  Globe,
  Radio,
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
  isLive?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Egypt DST helpers (UTC+2 standard, UTC+3 DST)                     */
/*  DST: last Friday of April → last Thursday of October              */
/* ------------------------------------------------------------------ */
function isCairoDst(d: Date): boolean {
  const year = d.getUTCFullYear();
  const april = new Date(Date.UTC(year, 3, 30));
  while (april.getUTCDay() !== 5) april.setUTCDate(april.getUTCDate() - 1);
  const october = new Date(Date.UTC(year, 9, 31));
  while (october.getUTCDay() !== 4) october.setUTCDate(october.getUTCDate() - 1);
  return d >= april && d < october;
}
function getCairoOffsetMs(d: Date): number {
  return isCairoDst(d) ? 3 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
}
function toCairoInputValue(utcIso: string): string {
  const d = new Date(utcIso);
  if (isNaN(d.getTime())) return "";
  const cairoMs = d.getTime() + getCairoOffsetMs(d);
  const c = new Date(cairoMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${c.getUTCFullYear()}-${pad(c.getUTCMonth() + 1)}-${pad(c.getUTCDate())}T${pad(c.getUTCHours())}:${pad(c.getUTCMinutes())}`;
}
function fromCairoInputValue(cairoStr: string): string {
  const [datePart, timePart] = cairoStr.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const temp = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetMs = getCairoOffsetMs(temp);
  return new Date(temp.getTime() - offsetMs).toISOString();
}
function formatCairo(utcIso: string): string {
  const d = new Date(utcIso);
  if (isNaN(d.getTime())) return "Invalid date";
  const cairoMs = d.getTime() + getCairoOffsetMs(d);
  const c = new Date(cairoMs);
  return c.toLocaleString("en-GB", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) + " (Cairo)";
}

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: { ...(options?.headers || {}), "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [newRoundName, setNewRoundName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newMatch, setNewMatch] = useState<Record<string, { homeTeam: string; awayTeam: string; matchDate: string }>>({});
  const [scoreInputs, setScoreInputs] = useState<Record<string, { home: string; away: string }>>({});
  const [matchInputs, setMatchInputs] = useState<Record<string, { homeTeam: string; awayTeam: string; matchDate: string }>>({});
  const [error, setError] = useState("");

  const fetchRounds = useCallback(async () => {
    try {
      setError("");
      const data = await fetchJSON("/api/admin/rounds");
      const sorted = (data.rounds || []).map((r: Round) => ({
        ...r,
        matches: [...r.matches].sort(
          (a: Match, b: Match) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
        ),
      }));
      setRounds(sorted);
      setScoreInputs((prev) => {
        const init = { ...prev };
        sorted.forEach((r: Round) => {
          r.matches.forEach((m) => {
            if (!(m.id in init)) init[m.id] = { home: m.homeScore !== null ? String(m.homeScore) : "", away: m.awayScore !== null ? String(m.awayScore) : "" };
          });
        });
        return init;
      });
      setMatchInputs((prev) => {
        const init = { ...prev };
        sorted.forEach((r: Round) => {
          r.matches.forEach((m) => {
            if (!(m.id in init)) init[m.id] = { homeTeam: m.homeTeam, awayTeam: m.awayTeam, matchDate: toCairoInputValue(m.matchDate) };
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

  useEffect(() => { if (user?.isAdmin) fetchRounds(); }, [user, fetchRounds]);

  const createRound = async () => {
    if (!newRoundName.trim()) return;
    try {
      setCreating(true); setError("");
      await fetchJSON("/api/admin/rounds", { method: "POST", body: JSON.stringify({ name: newRoundName.trim(), order: rounds.length }) });
      setNewRoundName("");
      await fetchRounds();
      alert("Round created!");
    } catch (err: any) { console.error(err); setError(err.message || "Failed to create round"); alert("Error: " + (err.message || "Unknown error")); }
    finally { setCreating(false); }
  };

  const updateRoundStatus = async (id: string, status: string) => {
    try { setError(""); await fetchJSON("/api/admin/rounds", { method: "PATCH", body: JSON.stringify({ id, status }) }); await fetchRounds(); }
    catch (err: any) { console.error(err); alert("Error: " + (err.message || "Unknown error")); }
  };

  const addMatch = async (roundId: string) => {
    const m = newMatch[roundId];
    if (!m?.homeTeam?.trim() || !m?.awayTeam?.trim()) { alert("Please enter both home and away teams"); return; }
    try {
      setError("");
      const matchDate = m.matchDate ? fromCairoInputValue(m.matchDate) : new Date().toISOString();
      await fetchJSON("/api/admin/matches", { method: "POST", body: JSON.stringify({ roundId, homeTeam: m.homeTeam.trim(), awayTeam: m.awayTeam.trim(), matchDate, order: 0 }) });
      setNewMatch((prev) => ({ ...prev, [roundId]: { homeTeam: "", awayTeam: "", matchDate: "" } }));
      await fetchRounds();
    } catch (err: any) { console.error(err); alert("Error: " + (err.message || "Unknown error")); }
  };

  const updateMatch = async (matchId: string) => {
    const m = matchInputs[matchId]; if (!m) return;
    try {
      setError("");
      await fetchJSON("/api/admin/matches", { method: "PATCH", body: JSON.stringify({ id: matchId, homeTeam: m.homeTeam?.trim(), awayTeam: m.awayTeam?.trim(), matchDate: m.matchDate ? fromCairoInputValue(m.matchDate) : null }) });
      await fetchRounds();
      alert("Match updated!");
    } catch (err: any) { console.error(err); alert("Error: " + (err.message || "Unknown error")); }
  };

  const toggleMatchLive = async (matchId: string, isLive: boolean) => {
    try {
      setError("");
      await fetchJSON("/api/admin/matches", { method: "PATCH", body: JSON.stringify({ id: matchId, isLive }) });
      await fetchRounds();
    } catch (err: any) { console.error(err); alert("Error: " + (err.message || "Unknown error")); }
  };

  const updateScore = async (matchId: string) => {
    const homeScore = scoreInputs[matchId]?.home ?? ""; const awayScore = scoreInputs[matchId]?.away ?? "";
    try {
      setError("");
      await fetchJSON("/api/admin/scores", { method: "PATCH", body: JSON.stringify({ id: matchId, homeScore: homeScore === "" ? null : Number(homeScore), awayScore: awayScore === "" ? null : Number(awayScore) }) });
      await fetchRounds();
      alert("Score updated!");
    } catch (err: any) { console.error(err); alert("Error: " + (err.message || "Unknown error")); }
  };

  const deleteMatch = async (matchId: string) => {
    if (!confirm("Delete this match?")) return;
    try { setError(""); await fetchJSON("/api/admin/matches", { method: "DELETE", body: JSON.stringify({ id: matchId }) }); await fetchRounds(); }
    catch (err: any) { console.error(err); alert("Error: " + (err.message || "Unknown error")); }
  };

  if (loading || loadingData) return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-white/50 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>;
  if (!user?.isAdmin) return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-wc-red">Forbidden</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 flex items-center gap-3">
        <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-wc-red" /> Admin Panel
      </h1>

      {error && <div className="mb-6 p-4 rounded-xl bg-wc-red/10 border border-wc-red/30 text-wc-red text-sm">⚠️ {error}</div>}

      <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
        <h2 className="text-base sm:text-lg font-bold mb-4">Create Match Week</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={newRoundName} onChange={(e) => setNewRoundName(e.target.value)} placeholder="e.g., Group Stage - Matchday 1" className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm" onKeyDown={(e) => e.key === "Enter" && createRound()} />
          <button onClick={createRound} disabled={creating} className="px-6 py-3 rounded-lg bg-wc-gold text-wc-dark font-bold hover:bg-wc-gold/90 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Create
          </button>
        </div>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {rounds.map((round) => (
          <div key={round.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white/5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold">{round.name}</h2>
                <div className="text-xs sm:text-sm text-white/50 mt-1">{round.matches.length} matches</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateRoundStatus(round.id, "OPEN")} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition ${round.status === "OPEN" ? "bg-green-500/20 text-green-400" : "bg-white/5 hover:bg-white/10"}`}><Unlock className="w-3 h-3" /> OPEN</button>
                <button onClick={() => updateRoundStatus(round.id, "LIVE")} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition ${round.status === "LIVE" ? "bg-wc-red/20 text-wc-red" : "bg-white/5 hover:bg-white/10"}`}><Play className="w-3 h-3" /> LIVE</button>
                <button onClick={() => updateRoundStatus(round.id, "FINISHED")} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition ${round.status === "FINISHED" ? "bg-wc-blue/20 text-wc-blue" : "bg-white/5 hover:bg-white/10"}`}><CheckCircle className="w-3 h-3" /> DONE</button>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {round.matches.map((match) => {
                const m = matchInputs[match.id] || { homeTeam: match.homeTeam, awayTeam: match.awayTeam, matchDate: toCairoInputValue(match.matchDate) };
                return (
                  <div key={match.id} className={`px-4 sm:px-6 py-3 sm:py-4 ${match.isLive ? "bg-wc-red/5" : ""}`}>
                    <div className="flex flex-col gap-2 sm:gap-3">
                      {/* Row 1: Teams + Date + Live toggle + Save details */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex flex-1 gap-2">
                          <input type="text" value={m.homeTeam} onChange={(e) => setMatchInputs((prev) => ({ ...prev, [match.id]: { ...prev[match.id], homeTeam: e.target.value } }))} className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm font-semibold" placeholder="Home Team" />
                          <div className="flex items-center justify-center px-2 text-white/20 text-sm font-bold">VS</div>
                          <input type="text" value={m.awayTeam} onChange={(e) => setMatchInputs((prev) => ({ ...prev, [match.id]: { ...prev[match.id], awayTeam: e.target.value } }))} className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm font-semibold" placeholder="Away Team" />
                        </div>
                        <div className="flex gap-2 items-center">
                          <Calendar className="w-4 h-4 text-white/20 hidden sm:block" />
                          <input type="datetime-local" value={m.matchDate} onChange={(e) => setMatchInputs((prev) => ({ ...prev, [match.id]: { ...prev[match.id], matchDate: e.target.value } }))} className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm" />
                          <button onClick={() => updateMatch(match.id)} className="p-2 rounded-lg bg-wc-blue/10 text-wc-blue hover:bg-wc-blue/20 transition border border-wc-blue/20" title="Update match details"><Pencil className="w-4 h-4" /></button>
                          {/* --- LIVE TOGGLE --- */}
                          <button onClick={() => toggleMatchLive(match.id, !match.isLive)} className={`px-2.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${match.isLive ? "bg-wc-red/20 text-wc-red border border-wc-red/20" : "bg-white/5 text-white/30 hover:bg-white/10 border border-transparent"}`} title={match.isLive ? "Stop live scoring" : "Start live scoring"}>
                            {match.isLive ? (
                              <><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-wc-red opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-wc-red"></span></span>LIVE</>
                            ) : (
                              <><Radio className="w-3 h-3" />GO LIVE</>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Row 2: Cairo time display */}
                      <div className="flex items-center gap-2 text-xs text-wc-gold/60">
                        <Globe className="w-3 h-3" /> {formatCairo(match.matchDate)}
                      </div>

                      {/* Row 3: Score + Actions */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="text-xs text-white/40 mr-2">Live Score:</div>
                        <input type="number" min={0} value={scoreInputs[match.id]?.home ?? ""} onChange={(e) => setScoreInputs((prev) => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value } }))} placeholder="H" className="w-16 text-center px-2 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm" />
                        <span className="text-white/30">-</span>
                        <input type="number" min={0} value={scoreInputs[match.id]?.away ?? ""} onChange={(e) => setScoreInputs((prev) => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value } }))} placeholder="A" className="w-16 text-center px-2 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm" />
                        <button onClick={() => updateScore(match.id)} className="p-2 rounded-lg bg-wc-gold/20 text-wc-gold hover:bg-wc-gold/30 transition" title="Update score"><Save className="w-4 h-4" /></button>
                        <button onClick={() => deleteMatch(match.id)} className="p-2 rounded-lg text-wc-red hover:bg-wc-red/10 transition" title="Delete match"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add new match */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white/5 flex flex-col sm:flex-row gap-2">
                <input type="text" placeholder="Home Team" value={newMatch[round.id]?.homeTeam || ""} onChange={(e) => setNewMatch((prev) => ({ ...prev, [round.id]: { ...prev[round.id], homeTeam: e.target.value, awayTeam: prev[round.id]?.awayTeam || "", matchDate: prev[round.id]?.matchDate || "" } }))} className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm" />
                <input type="text" placeholder="Away Team" value={newMatch[round.id]?.awayTeam || ""} onChange={(e) => setNewMatch((prev) => ({ ...prev, [round.id]: { ...prev[round.id], awayTeam: e.target.value, homeTeam: prev[round.id]?.homeTeam || "", matchDate: prev[round.id]?.matchDate || "" } }))} className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm" />
                <input type="datetime-local" value={newMatch[round.id]?.matchDate || ""} onChange={(e) => setNewMatch((prev) => ({ ...prev, [round.id]: { ...prev[round.id], matchDate: e.target.value, homeTeam: prev[round.id]?.homeTeam || "", awayTeam: prev[round.id]?.awayTeam || "" } }))} className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none text-sm" />
                <button onClick={() => addMatch(round.id)} className="px-4 py-2 rounded-lg bg-wc-gold text-wc-dark font-bold hover:bg-wc-gold/90 transition text-sm"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}

        {rounds.length === 0 && !loadingData && (
          <div className="text-center text-white/30 py-12">No rounds yet. Create one above!</div>
        )}
      </div>
    </div>
  );
}
