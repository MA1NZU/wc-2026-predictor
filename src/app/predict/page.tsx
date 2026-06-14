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
};

type Round = {
  id: string;
  name: string;
  status: string;
  matches: Match[];
};

/* ------------------------------------------------------------------ */
/*  Country -> ISO 2-letter code for flagcdn.com                       */
/* ------------------------------------------------------------------ */
const COUNTRY_CODES: Record<string, string> = {
  AFGHANISTAN: "af", ALBANIA: "al", ALGERIA: "dz", ANDORRA: "ad", ANGOLA: "ao",
  ANTIGUA: "ag", ARGENTINA: "ar", ARMENIA: "am", AUSTRALIA: "au", AUSTRIA: "at",
  AZERBAIJAN: "az", BAHAMAS: "bs", BAHRAIN: "bh", BANGLADESH: "bd", BARBADOS: "bb",
  BELARUS: "by", BELGIUM: "be", BELIZE: "bz", BENIN: "bj", BERMUDA: "bm",
  BHUTAN: "bt", BOLIVIA: "bo", BOSNIA: "ba", BOTSWANA: "bw", BRAZIL: "br",
  BULGARIA: "bg", BURKINA: "bf", BURUNDI: "bi", CAMBODIA: "kh", CAMEROON: "cm",
  CANADA: "ca", CAPE: "cv", CHAD: "td", CHILE: "cl", CHINA: "cn",
  COLOMBIA: "co", COMOROS: "km", CONGO: "cg", COSTA: "cr", CROATIA: "hr",
  CUBA: "cu", CYPRUS: "cy", CZECH: "cz", CZECHIA: "cz", DENMARK: "dk",
  DJIBOUTI: "dj", DOMINICA: "dm", DOMINICAN: "do", ECUADOR: "ec", EGYPT: "eg",
  EL: "sv", ENGLAND: "gb-eng", EQUATORIAL: "gq", ERITREA: "er", ESTONIA: "ee",
  ESWATINI: "sz", ETHIOPIA: "et", FIJI: "fj", FINLAND: "fi", FRANCE: "fr",
  GABON: "ga", GAMBIA: "gm", GEORGIA: "ge", GERMANY: "de", GHANA: "gh",
  GIBRALTAR: "gi", GREECE: "gr", GRENADA: "gd", GUADELOUPE: "gp", GUAM: "gu",
  GUATEMALA: "gt", GUINEA: "gn", GUYANA: "gy", HAITI: "ht", HONDURAS: "hn",
  HONG: "hk", HUNGARY: "hu", ICELAND: "is", INDIA: "in", INDONESIA: "id",
  IRAN: "ir", IRAQ: "iq", IRELAND: "ie", ISRAEL: "il", ITALY: "it",
  IVORY: "ci", JAMAICA: "jm", JAPAN: "jp", JORDAN: "jo", KAZAKHSTAN: "kz",
  KENYA: "ke", KIRIBATI: "ki", KOREA: "kr", KOSOVO: "xk", KUWAIT: "kw",
  KYRGYZSTAN: "kg", LAOS: "la", LATVIA: "lv", LEBANON: "lb", LESOTHO: "ls",
  LIBERIA: "lr", LIBYA: "ly", LIECHTENSTEIN: "li", LITHUANIA: "lt", LUXEMBOURG: "lu",
  MACAU: "mo", MACEDONIA: "mk", MADAGASCAR: "mg", MALAWI: "mw", MALAYSIA: "my",
  MALDIVES: "mv", MALI: "ml", MALTA: "mt", MARTINIQUE: "mq", MAURITANIA: "mr",
  MAURITIUS: "mu", MEXICO: "mx", MOLDOVA: "md", MONACO: "mc", MONGOLIA: "mn",
  MONTENEGRO: "me", MOROCCO: "ma", MOZAMBIQUE: "mz", MYANMAR: "mm", NAMIBIA: "na",
  NEPAL: "np", NETHERLANDS: "nl", NEWCALEDONIA: "nc", "NEW ZEALAND": "nz", NICARAGUA: "ni",
  NIGER: "ne", NIGERIA: "ng", NORTH: "mk", NORTHERN: "gb", NORWAY: "no",
  OMAN: "om", PAKISTAN: "pk", PALESTINE: "ps", PANAMA: "pa", PAPUA: "pg",
  PARAGUAY: "py", PERU: "pe", PHILIPPINES: "ph", POLAND: "pl", PORTUGAL: "pt",
  PUERTO: "pr", QATAR: "qa", REUNION: "re", RICA: "cr", ROMANIA: "ro",
  RUSSIA: "ru", RWANDA: "rw", "SAINT LUCIA": "lc", SALVADOR: "sv", SAMOA: "ws",
  "SAN MARINO": "sm", SAUDI: "sa", SCOTLAND: "gb-sct", SENEGAL: "sn", SERBIA: "rs",
  SEYCHELLES: "sc", SIERRA: "sl", SINGAPORE: "sg", SLOVAKIA: "sk", SLOVENIA: "si",
  "SOLOMON ISLANDS": "sb", SOMALIA: "so", "SOUTH AFRICA": "za", "SOUTH KOREA": "kr", "SOUTH SUDAN": "ss",
  SPAIN: "es", SRI: "lk", STKITTS: "kn", SUDAN: "sd", SURINAME: "sr",
  SWEDEN: "se", SWITZERLAND: "ch", SYRIA: "sy", TAIWAN: "tw", TAJIKISTAN: "tj",
  TANZANIA: "tz", TAHITI: "pf", THAILAND: "th", TOGO: "tg", TRINIDAD: "tt",
  TUNISIA: "tn", TURKEY: "tr", TURKMENISTAN: "tm", UGANDA: "ug", UKRAINE: "ua",
  UNITED: "gb", URUGUAY: "uy", USA: "us", UZBEKISTAN: "uz", VANUATU: "vu",
  VENEZUELA: "ve", VIETNAM: "vn", WALES: "gb-wls", YEMEN: "ye", ZAMBIA: "zm",
  ZIMBABWE: "zw", SVG: "vc", "CÔTE D'IVOIRE": "ci", "COTE D'IVOIRE": "ci",
  MAYOTTE: "yt", CURACAO: "cw", ARUBA: "aw", BONAIRE: "bq", FRENCH: "gf",
  "ST VINCENT": "vc", "ST VINCENT AND THE GRENADINES": "vc", "VIRGIN ISLANDS": "vi",
};

function getCountryCode(name: string): string {
  const upper = name.toUpperCase().trim();
  if (COUNTRY_CODES[upper]) return COUNTRY_CODES[upper];
  for (const [key, code] of Object.entries(COUNTRY_CODES)) {
    if (upper.includes(key)) return code;
  }
  return upper.slice(0, 2).toLowerCase();
}

function FlagImage({ team, size = 40 }: { team: string; size?: number }) {
  const code = getCountryCode(team);
  const url = `https://flagcdn.com/w${size}/${code}.png`;
  return (
    <img
      src={url}
      alt={team}
      width={size}
      height={size}
      className="rounded-lg object-cover border border-white/10 bg-white/5"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPointsLabel(points: number | null) {
  if (points === null) return null;
  if (points === 0) return { text: "Miss", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" };
  if (points === 3) return { text: "Outcome", color: "text-wc-blue", bg: "bg-wc-blue/10", border: "border-wc-blue/20" };
  if (points === 6) return { text: "Perfect", color: "text-wc-gold", bg: "bg-wc-gold/10", border: "border-wc-gold/20" };
  if (points === 12) return { text: "Perfect 2x", color: "text-wc-gold", bg: "bg-wc-gold/20", border: "border-wc-gold/30" };
  if (points === 9) return { text: "Outcome 2x", color: "text-wc-blue", bg: "bg-wc-blue/20", border: "border-wc-blue/30" };
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
          (a: Match, b: Match) =>
            new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
        ),
      }));
      setRounds(sortedRounds);
      setInputs((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const init: Record<string, { home: string; away: string }> = {};
        sortedRounds.forEach((r: Round) => {
          r.matches.forEach((m: Match) => {
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
      if (sortedRounds.length > 0 && !activeTab) {
        setActiveTab(sortedRounds[0].id);
      }
      setLoadingData(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRounds();
    const interval = setInterval(fetchRounds, 10000);
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
      <div className="max-w-7xl mx-auto px-4 py-24 flex flex-col items-center gap-4 text-white/50">
        <Loader2 className="w-10 h-10 animate-spin text-wc-gold" />
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
        <a
          href="/login"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-wc-gold text-wc-dark font-bold hover:bg-wc-gold/90 transition"
        >
          Sign In to Predict <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  const activeRound = rounds.find((r) => r.id === activeTab) || rounds[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-wc-gold/20 flex items-center justify-center">
            <Swords className="w-5 h-5 text-wc-gold" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Your Predictions</h1>
        </div>
        <p className="text-white/50 text-sm sm:text-base ml-0 sm:ml-[52px]">
          Predict exact scores, pick your double, and watch points roll in live.
        </p>
      </div>

      {/* Round Tabs */}
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
                    ? "bg-white/10 text-white border border-white/20 shadow-lg shadow-wc-gold/5"
                    : "bg-white/5 text-white/50 hover:bg-white/8 hover:text-white/70 border border-transparent"
                } ${liveGlow ? "animate-pulse border-wc-red/30" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {round.status === "LIVE" && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-wc-red opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-wc-red"></span>
                    </span>
                  )}
                  {round.status === "FINISHED" && <CheckCircle2 className="w-3.5 h-3.5 text-wc-blue" />}
                  {round.status === "OPEN" && <Clock className="w-3.5 h-3.5 text-green-400" />}
                  {round.name}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Round Header */}
      {activeRound && (
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">{activeRound.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {activeRound.status === "LIVE" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-wc-red/10 border border-wc-red/20 text-wc-red text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-wc-red opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-wc-red"></span>
                    </span>
                    Live Scoring
                  </span>
                )}
                {activeRound.status === "OPEN" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Predictions Open
                  </span>
                )}
                {activeRound.status === "FINISHED" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-wc-blue/10 border border-wc-blue/20 text-wc-blue text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Completed
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-white/30">
              {activeRound.matches.length} match{activeRound.matches.length !== 1 ? "es" : ""}
            </div>
          </div>

          {/* Matches Grid */}
          <div className="grid gap-3 sm:gap-4">
            {activeRound.matches.map((match) => {
              const inp = inputs[match.id] || { home: "", away: "" };
              const isLocked = activeRound.status === "LIVE" || activeRound.status === "FINISHED";
              const hasPrediction = match.prediction !== null;
              const pointsMeta = getPointsLabel(match.points);
              const isDoubled = match.doublePick;

              return (
                <div
                  key={match.id}
                  className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isLocked
                      ? match.points && match.points > 0
                        ? "bg-white/[0.03] border-wc-gold/10 hover:border-wc-gold/20"
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                      : "bg-white/[0.03] border-white/5 hover:border-white/15"
                  } ${isDoubled ? "ring-1 ring-wc-gold/20" : ""}`}
                >
                  {/* Double Pick Banner */}
                  {isDoubled && !isLocked && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-wc-gold to-transparent" />
                  )}

                  <div className="p-4 sm:p-5 lg:p-6">
                    {/* Date */}
                    <div className="text-xs text-white/30 mb-3 uppercase tracking-wider font-semibold">
                      {formatDate(match.matchDate)}
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-5">
                      {/* Teams */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-4">
                          {/* Home Team */}
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl overflow-hidden shrink-0 border border-white/5">
                              <FlagImage team={match.homeTeam} size={48} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-base sm:text-lg truncate">{match.homeTeam}</div>
                            </div>
                          </div>

                          {/* VS / Score */}
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

                          {/* Away Team */}
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 flex-row-reverse text-right">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl overflow-hidden shrink-0 border border-white/5">
                              <FlagImage team={match.awayTeam} size={48} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-base sm:text-lg truncate">{match.awayTeam}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Divider on desktop */}
                      <div className="hidden lg:block w-px h-20 bg-white/5 self-center" />

                      {/* Actions / Results */}
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
                                <Clock className="w-4 h-4" />
                                Pending
                              </div>
                            )}
                            {!hasPrediction && (
                              <div className="px-3 sm:px-4 py-2 rounded-xl border border-wc-red/10 bg-wc-red/5 text-wc-red/70 text-xs sm:text-sm font-bold flex items-center gap-2">
                                <XCircle className="w-4 h-4" />
                                No Prediction
                              </div>
                            )}
                            {isDoubled && (
                              <div className="px-3 py-2 rounded-xl bg-wc-gold/10 border border-wc-gold/20 text-wc-gold">
                                <Zap className="w-4 h-4 fill-wc-gold" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <input
                                  type="number"
                                  min={0}
                                  value={inp.home}
                                  onChange={(e) =>
                                    setInputs({ ...inputs, [match.id]: { ...inp, home: e.target.value } })
                                  }
                                  placeholder="0"
                                  className="w-14 sm:w-16 h-12 sm:h-12 text-center text-lg font-bold px-2 rounded-xl bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none focus:ring-1 focus:ring-wc-gold/20 transition"
                                />
                                {hasPrediction && match.prediction?.homeScore === Number(inp.home) && inp.home !== "" && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-wc-dark" />
                                )}
                              </div>
                              <span className="text-white/20 font-bold">-</span>
                              <div className="relative">
                                <input
                                  type="number"
                                  min={0}
                                  value={inp.away}
                                  onChange={(e) =>
                                    setInputs({ ...inputs, [match.id]: { ...inp, away: e.target.value } })
                                  }
                                  placeholder="0"
                                  className="w-14 sm:w-16 h-12 sm:h-12 text-center text-lg font-bold px-2 rounded-xl bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none focus:ring-1 focus:ring-wc-gold/20 transition"
                                />
                                {hasPrediction && match.prediction?.awayScore === Number(inp.away) && inp.away !== "" && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-wc-dark" />
                                )}
                              </div>
                              <button
                                onClick={() => savePrediction(match.id)}
                                disabled={saving[match.id]}
                                className="h-12 px-3 sm:px-4 rounded-xl bg-wc-gold text-wc-dark font-bold hover:bg-wc-gold/90 transition disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {saving[match.id] ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                                <span className="hidden sm:inline text-sm">Save</span>
                              </button>
                            </div>

                            <button
                              onClick={() => setDoublePick(activeRound.id, match.id)}
                              className={`h-12 w-12 rounded-xl flex items-center justify-center transition border ${
                                isDoubled
                                  ? "bg-wc-gold/20 border-wc-gold/40 text-wc-gold shadow-[0_0_15px_rgba(255,184,28,0.15)]"
                                  : "bg-white/5 border-white/10 text-white/20 hover:text-white/60 hover:border-white/20"
                              }`}
                              title="Double points for this match"
                            >
                              <Star className={`w-5 h-5 ${isDoubled ? "fill-wc-gold" : ""}`} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Locked Footer */}
                  {isLocked && (
                    <div className="px-4 sm:px-5 lg:px-6 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-white/30">
                        <Lock className="w-3.5 h-3.5" />
                        Predictions locked — {activeRound.status === "LIVE" ? "live scoring active" : "round completed"}
                      </div>
                      {isDoubled && (
                        <div className="text-xs text-wc-gold/60 font-medium flex items-center gap-1">
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
                <p className="text-white/20 text-sm mt-1">Check back later or contact the admin.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 sm:mt-10 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 max-w-2xl">
        <div className="flex items-center gap-2 text-xs text-white/30">
          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          Prediction saved
        </div>
        <div className="flex items-center gap-2 text-xs text-white/30">
          <Star className="w-3 h-3 text-wc-gold fill-wc-gold shrink-0" />
          Double pick
        </div>
        <div className="flex items-center gap-2 text-xs text-white/30">
          <Trophy className="w-3 h-3 text-wc-gold shrink-0" />
          Perfect = 6pts
        </div>
        <div className="flex items-center gap-2 text-xs text-white/30">
          <Zap className="w-3 h-3 text-wc-blue shrink-0" />
          Correct = 3pts
        </div>
      </div>
    </div>
  );
}
