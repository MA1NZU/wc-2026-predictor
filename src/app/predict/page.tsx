"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  Swords,
  Lock,
  Star,
  Save,
  Trophy,
  Zap,
  Clock,
  Shield,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Medal,
} from "lucide-react";

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
  isLive?: boolean;
};

type Round = {
  id: string;
  name: string;
  status: string;
  matches: Match[];
};

function getFlag(team: string) {
  const flags: Record<string, string> = {
    /* ---------- UEFA (16) ---------- */

  FRANCE: "🇫🇷", GERMANY: "🇩🇪", ENGLAND: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", SPAIN: "🇪🇸", PORTUGAL: "🇵🇹",

  NETHERLANDS: "🇳🇱", BELGIUM: "🇧🇪", ITALY: "🇮🇹", CROATIA: "🇭🇷", DENMARK: "🇩🇰",

  SWITZERLAND: "🇨🇭", POLAND: "🇵🇱", WALES: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", SCOTLAND: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", UKRAINE: "🇺🇦",

  AUSTRIA: "🇦🇹", SERBIA: "🇷🇸", SWEDEN: "🇸🇪", NORWAY: "🇳🇴", CZECHIA: "🇨🇿",

  CZECH: "🇨🇿", HUNGARY: "🇭🇺", ROMANIA: "🇷🇴", SLOVAKIA: "🇸🇰", SLOVENIA: "🇸🇮",

  GREECE: "🇬🇷", TURKEY: "🇹🇷", IRELAND: "🇮🇪", NORTHERN: "🇬🇧", BOSNIA: "🇧🇦",

  FINLAND: "🇫🇮", RUSSIA: "🇷🇺", "SOUTH AFRICA": "🇿🇦", "TURKIYE": "🇹🇷", "SOUTH KOREA": "🇰🇷", "IVORY COAST": "🇨🇮", "CAPE VERDE": "🇨🇻", "SAUDI ARABIA": "🇸🇦", "DR CONGO": "🇨🇬",

  /* ---------- CONMEBOL (6) ---------- */

  ARGENTINA: "🇦🇷", BRAZIL: "🇧🇷", URUGUAY: "🇺🇾", COLOMBIA: "🇨🇴", ECUADOR: "🇪🇨",

  CHILE: "🇨🇱", PERU: "🇵🇪", PARAGUAY: "🇵🇾", BOLIVIA: "🇧🇴", VENEZUELA: "🇻🇪", 

  /* ---------- CONCACAF (9 incl. 3 hosts) ---------- */

  USA: "🇺🇸", CANADA: "🇨🇦", MEXICO: "🇲🇽", PANAMA: "🇵🇦", COSTA: "🇨🇷",

  RICA: "🇨🇷", HONDURAS: "🇭🇳", JAMAICA: "🇯🇲", EL: "🇸🇻", SALVADOR: "🇸🇻",

  GUATEMALA: "🇬🇹", HAITI: "🇭🇹", TRINIDAD: "🇹🇹", CUBA: "🇨🇺", CURACAO: "🇨🇼",

  NICARAGUA: "🇳🇮", BERMUDA: "🇧🇲",

  /* ---------- CAF (9) ---------- */

  MOROCCO: "🇲🇦", EGYPT: "🇪🇬", SENEGAL: "🇸🇳", TUNISIA: "🇹🇳", ALGERIA: "🇩🇿",

  NIGERIA: "🇳🇬", CAMEROON: "🇨🇲", GHANA: "🇬🇭", IVORY: "🇨🇮", COTE: "🇨🇮",

  "CÔTE D'IVOIRE": "🇨🇮", MALI: "🇲🇱", BURKINA: "🇧🇫", SOUTH: "🇿🇦", KENYA: "🇰🇪",

  ZAMBIA: "🇿🇲", DR: "🇨🇩", CONGO: "🇨🇬", ANGOLA: "🇦🇴", TANZANIA: "🇹🇿",

  UGANDA: "🇺🇬", GABON: "🇬🇦", MOZAMBIQUE: "🇲🇿", MADAGASCAR: "🇲🇬", LIBERIA: "🇱🇷",

  TOGO: "🇹🇬", SUDAN: "🇸🇩", MAURITANIA: "🇲🇷", LIBYA: "🇱🇾", GUINEA: "🇬🇳",

  NAMIBIA: "🇳🇦", BENIN: "🇧🇯", RWANDA: "🇷🇼", MALAWI: "🇲🇼", ZIMBABWE: "🇿🇼",

  SIERRA: "🇸🇱", BOTSWANA: "🇧🇼", ESWATINI: "🇸🇿", LESOTHO: "🇱🇸", COMOROS: "🇰🇲",

  CHAD: "🇹🇩", ERITREA: "🇪🇷", DJIBOUTI: "🇩🇯", CENTRAL: "🇨🇫", EQUATORIAL: "🇬🇶",

  SAO: "🇸🇹", CAPE: "🇨🇻", SEYCHELLES: "🇸🇨", MAURITIUS: "🇲🇺", BURUNDI: "🇧🇮",

  SOMALIA: "🇸🇴", SOUTHSUDAN: "🇸🇸", "SOUTH SUDAN": "🇸🇸",

  /* ---------- AFC (8) ---------- */

  JAPAN: "🇯🇵", KOREA: "🇰🇷", AUSTRALIA: "🇦🇺", IRAN: "🇮🇷", SAUDI: "🇸🇦",

  ARABIA: "🇸🇦", QATAR: "🇶🇦", IRAQ: "🇮🇶", UZBEKISTAN: "🇺🇿", JORDAN: "🇯🇴",

  UAE: "🇦🇪", BAHRAIN: "🇧🇭", CHINA: "🇨🇳", THAILAND: "🇹🇭", INDONESIA: "🇮🇩",

  SYRIA: "🇸🇾", OMAN: "🇴🇲", INDIA: "🇮🇳", LEBANON: "🇱🇧", VIETNAM: "🇻🇳",

  TAJIKISTAN: "🇹🇯", KUWAIT: "🇰🇼", PALESTINE: "🇵🇸", MALAYSIA: "🇲🇾", SINGAPORE: "🇸🇬",

  KYRGYZSTAN: "🇰🇬", MONGOLIA: "🇲🇳", TURKMENISTAN: "🇹🇲", HONG: "🇭🇰", TAIWAN: "🇹🇼",

  MACAU: "🇲🇴", YEMEN: "🇾🇪", AFGHANISTAN: "🇦🇫", BANGLADESH: "🇧🇩", NEPAL: "🇳🇵",

  PAKISTAN: "🇵🇰", SRI: "🇱🇰", BHUTAN: "🇧🇹", MALDIVES: "🇲🇻", GUAM: "🇬🇺",

  CAMBODIA: "🇰🇭", LAOS: "🇱🇦", MYANMAR: "🇲🇲", BRUNEI: "🇧🇳", PHILIPPINES: "🇵🇭",

  NORTH: "🇰🇵",

  /* ---------- OFC (1) ---------- */

  "NEW ZEALAND": "🇳🇿", FIJI: "🇫🇯", PAPUA: "🇵🇬", NEWCALEDONIA: "🇳🇨", TAHITI: "🇵🇫",

  SAMOA: "🇼🇸", VANUATU: "🇻🇺", SOLOMON: "🇸🇧",
  };
  const upper = team.toUpperCase().trim();
  return flags[upper] || flags[upper.slice(0, 3)] || "🏳️";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getPointsLabel(points: number | null, isDoubled: boolean) {
  if (points === null) return null;
  if (points === 0) return { text: "Miss", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" };
  if (isDoubled) {
    if (points === 12) return { text: "Perfect 2x", color: "text-yellow-400", bg: "bg-yellow-400/20", border: "border-yellow-400/30" };
    if (points === 6) return { text: "Outcome 2x", color: "text-blue-400", bg: "bg-blue-400/20", border: "border-blue-400/30" };
  }
  if (points === 6) return { text: "Perfect", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" };
  if (points === 3) return { text: "Outcome", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" };
  return { text: `${points}pts`, color: "text-white", bg: "bg-white/5", border: "border-white/10" };
}

export default function PredictPage() {
  const { user, loading } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string }>>({});
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const fetchRounds = useCallback(async () => {
    const res = await fetch("/api/rounds", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const sortedRounds = (data.rounds || []).map((r: Round) => ({
        ...r,
        matches: [...r.matches].sort(
          (a: Match, b: Match) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
        ),
      }));

      setRounds(sortedRounds);

      // FIX: Properly merge existing inputs with newly fetched predictions
      setInputs((prev) => {
        const newInputs: Record<string, { home: string; away: string }> = { ...prev };
        sortedRounds.forEach((r: Round) => {
          r.matches.forEach((m: Match) => {
            if (m.prediction && !newInputs[m.id]) {
              newInputs[m.id] = {
                home: String(m.prediction.homeScore),
                away: String(m.prediction.awayScore),
              };
            }
          });
        });
        return newInputs;
      });

      if (sortedRounds.length > 0 && !activeTab) {
        setActiveTab(sortedRounds[0].id);
      }
      setLoadingData(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRounds();
    const interval = setInterval(fetchRounds, 60000);
    return () => clearInterval(interval);
  }, [fetchRounds]);

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
      const err = await res.json();
      alert(err.error || "Failed to save prediction");
    }
  };

  const setDoublePick = async (roundId: string, matchId: string) => {
    const res = await fetch("/api/double-pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId, matchId }),
    });
    if (res.ok) fetchRounds();
    else alert("Failed to set double pick");
  };

  if (loading || loadingData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 flex flex-col items-center gap-4 text-white/50">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-400" />
        <p className="text-lg">Loading matches...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-6">
          <Swords className="w-10 h-10 text-white/30" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Predictions Locked</h2>
        <p className="text-white/50 mb-6 px-4">
          Sign in to make your World Cup 2026 predictions and compete on the leaderboard.
        </p>
        <a href="/login" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-yellow-400 text-black font-bold hover:bg-yellow-500 transition">
          Sign In to Predict <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  const activeRound = rounds.find((r) => r.id === activeTab) || rounds[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/20 flex items-center justify-center">
            <Swords className="w-5 h-5 text-yellow-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Your Predictions</h1>
        </div>
        <p className="text-white/50 text-sm sm:text-base ml-0 sm:ml-[52px]">
          Predict exact scores, pick your double, and watch points roll in live.
        </p>
      </div>

      {rounds.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 sm:mb-6 scrollbar-hide">
          {rounds.map((round) => {
            const isActive = activeTab === round.id;
            const liveGlow = round.status === "LIVE" && !isActive;
            return (
              <button
                key={round.id}
                onClick={() => setActiveTab(round.id)}
                className={`relative px-4 sm:px-5 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-white/10 text-white border border-white/20 shadow-lg"
                    : "bg-white/5 text-white/50 hover:bg-white/8 hover:text-white/70 border border-transparent"
                } ${liveGlow ? "animate-pulse border-red-500/30" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {round.status === "LIVE" && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>}
                  {round.status === "FINISHED" && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                  {round.status === "OPEN" && <Clock className="w-3.5 h-3.5 text-green-400" />}
                  {round.name}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {activeRound && (
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">{activeRound.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {activeRound.status === "LIVE" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span></span>
                    Live Scoring
                  </span>
                )}
                {activeRound.status === "OPEN" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Predictions Open
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-white/30">
              {activeRound.matches.length} match{activeRound.matches.length !== 1 ? "es" : ""}
            </div>
          </div>

          <div className="grid gap-3 sm:gap-4">
            {activeRound.matches.map((match) => {
              const inp = inputs[match.id] || { home: "", away: "" };
              const isLocked = match.isLive || activeRound.status === "LIVE" || activeRound.status === "FINISHED";
              const hasPrediction = match.prediction !== null;
              const isDoubled = match.doublePick;
              const pointsMeta = getPointsLabel(match.points, isDoubled);

              return (
                <div
                  key={match.id}
                  className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isLocked
                      ? match.points && match.points > 0
                        ? "bg-white/[0.03] border-yellow-400/10 hover:border-yellow-400/20"
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                      : "bg-white/[0.03] border-white/5 hover:border-white/15"
                  } ${isDoubled ? "ring-1 ring-yellow-400/20" : ""} ${match.isLive ? "ring-1 ring-red-500/20" : ""}`}
                >
                  {isDoubled && !isLocked && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />}
                  {match.isLive && activeRound.status === "OPEN" && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent" />}

                  <div className="p-4 sm:p-5 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-white/30 mb-3 uppercase tracking-wider font-semibold">
                        {formatDate(match.matchDate)}
                      </div>
                      {match.isLive && activeRound.status === "OPEN" && (
                        <div className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-2">
                          <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span></span>
                          LIVE
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-4">
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/5 flex items-center justify-center text-xl sm:text-2xl shrink-0 border border-white/5">
                              {getFlag(match.homeTeam)}
                            </div>
                            <div className="min-w-0"><div className="font-bold text-base sm:text-lg truncate">{match.homeTeam}</div></div>
                          </div>

                          <div className="flex flex-col items-center gap-0.5 px-2 sm:px-4 shrink-0">
                            {isLocked && match.homeScore !== null && match.awayScore !== null ? (
                              <div className="text-xl sm:text-2xl font-black text-white/90 tracking-wider">
                                {match.homeScore} - {match.awayScore}
                              </div>
                            ) : (
                              <div className="text-xs sm:text-sm font-bold text-white/20 uppercase tracking-widest">VS</div>
                            )}
                            {isLocked && hasPrediction && (
                              <div className="text-[10px] sm:text-xs text-white/30">
                                You: {match.prediction?.homeScore}-{match.prediction?.awayScore}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 flex-row-reverse text-right">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/5 flex items-center justify-center text-xl sm:text-2xl shrink-0 border border-white/5">
                              {getFlag(match.awayTeam)}
                            </div>
                            <div className="min-w-0"><div className="font-bold text-base sm:text-lg truncate">{match.awayTeam}</div></div>
                          </div>
                        </div>
                      </div>

                      <div className="hidden lg:block w-px h-20 bg-white/5 self-center" />

                      <div className="flex items-center justify-center lg:justify-end gap-2 sm:gap-3">
                        {isLocked ? (
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                            {pointsMeta && (
                              <div className={`px-3 sm:px-4 py-2 rounded-xl border ${pointsMeta.bg} ${pointsMeta.border} flex items-center gap-2`}>
                                <Medal className={`w-4 h-4 ${pointsMeta.color}`} />
                                <div>
                                  <div className={`text-xs sm:text-sm font-bold ${pointsMeta.color}`}>{pointsMeta.text}</div>
                                  <div className={`text-[10px] sm:text-xs ${pointsMeta.color} opacity-60`}>{match.points} pts</div>
                                </div>
                              </div>
                            )}
                            {!pointsMeta && hasPrediction && (
                              <div className="px-3 sm:px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/30 text-xs sm:text-sm font-bold flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Pending
                              </div>
                            )}
                            {!hasPrediction && (
                              <div className="px-3 sm:px-4 py-2 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400/70 text-xs sm:text-sm font-bold flex items-center gap-2">
                                <XCircle className="w-4 h-4" /> No Prediction
                              </div>
                            )}
                            {isDoubled && (
                              <div className="px-3 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
                                <Zap className="w-4 h-4 fill-yellow-400" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <input type="number" min={0} value={inp.home} onChange={(e) => setInputs({ ...inputs, [match.id]: { ...inp, home: e.target.value } })} placeholder="0" className="w-14 sm:w-16 h-12 sm:h-12 text-center text-lg font-bold px-2 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400/20 transition" />
                              <span className="text-white/20 font-bold">-</span>
                              <input type="number" min={0} value={inp.away} onChange={(e) => setInputs({ ...inputs, [match.id]: { ...inp, away: e.target.value } })} placeholder="0" className="w-14 sm:w-16 h-12 sm:h-12 text-center text-lg font-bold px-2 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400/20 transition" />
                              <button onClick={() => savePrediction(match.id)} disabled={saving[match.id]} className="h-12 px-3 sm:px-4 rounded-xl bg-yellow-400 text-black font-bold hover:bg-yellow-500 transition disabled:opacity-50 flex items-center gap-1.5">
                                {saving[match.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span className="hidden sm:inline text-sm">Save</span>
                              </button>
                            </div>
                            <button onClick={() => setDoublePick(activeRound.id, match.id)} className={`h-12 w-12 rounded-xl flex items-center justify-center transition border ${isDoubled ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-400" : "bg-white/5 border-white/10 text-white/20 hover:text-white/60 hover:border-white/20"}`} title="Double points">
                              <Star className={`w-5 h-5 ${isDoubled ? "fill-yellow-400" : ""}`} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isLocked && (
                    <div className="px-4 sm:px-5 lg:px-6 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-white/30">
                        <Lock className="w-3.5 h-3.5" />
                        Predictions locked
                      </div>
                      {isDoubled && (
                        <div className="text-xs text-yellow-400/60 font-medium flex items-center gap-1">
                          <Zap className="w-3 h-3" /> 2x
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {activeRound.matches.length === 0 && (
              <div className="text-center py-12 sm:py-16 rounded-2xl bg-white/[0.02] border border-white/5">
                <Shield className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/30">No matches in this round yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
