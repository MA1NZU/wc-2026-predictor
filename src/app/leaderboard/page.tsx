"use client";

import { useState } from "react";
import { useGameContext } from "@/context/GameContext";
import { Trophy, Medal, Loader2, Crown, X, Swords, Zap, Star } from "lucide-react";

// --- Types ---
type MatchPrediction = {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  homeScore: number | null;
  awayScore: number | null;
  isLive: boolean;
  // These are now flat in the API response
  predictedHome: number | null;
  predictedAway: number | null;
  isDoubled: boolean;
  basePoints: number | null;
  points: number | null;
  hasScore: boolean;
};

type Round = {
  id: string;
  name: string;
  status: string;
  matches: MatchPrediction[];
};

type UserDetail = {
  user: { id: string; username: string };
  totalPoints: number;
  predictionsCount: number;
  rounds: Round[];
};

// --- Helpers ---
function getFlag(team: string) {
  if (!team) return "🏳️";
  const flags: Record<string, string> = {
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
  if (!dateStr) return "Date TBD";
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
    if (points === 12) return { text: "Perfect 2x", color: "text-wc-gold", bg: "bg-wc-gold/20", border: "border-wc-gold/30" };
    if (points === 6) return { text: "Outcome 2x", color: "text-wc-blue", bg: "bg-wc-blue/20", border: "border-wc-blue/30" };
  }
  if (points === 6) return { text: "Perfect", color: "text-wc-gold", bg: "bg-wc-gold/10", border: "border-wc-gold/20" };
  if (points === 3) return { text: "Outcome", color: "text-wc-blue", bg: "bg-wc-blue/10", border: "border-wc-blue/20" };
  return { text: `${points}pts`, color: "text-white", bg: "bg-white/5", border: "border-white/10" };
}

export default function LeaderboardPage() {
  const { leaderboard, loading: loadingContext } = useGameContext();
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);

  const openUserDetail = async (userId: string) => {
    setLoadingDetail(true);
    setSelectedUser(null);
    setActiveRoundIndex(0);
    try {
      const res = await fetch(`/api/leaderboard/${userId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data);
      }
    } catch (error) {
      console.error("Failed to load user details", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (loadingContext) {
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
          {leaderboard?.map((user: any, index: number) => (
            <div
              key={user.id}
              className={`grid grid-cols-[auto_1fr_auto] gap-4 px-6 py-4 items-center transition ${
                index < 3 ? "hover:bg-white/5" : "hover:bg-white/[0.02]"
              }`}
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
              <div>
                <button
                  onClick={() => openUserDetail(user.id)}
                  className="font-semibold text-left hover:text-wc-gold transition cursor-pointer"
                >
                  {user.username}
                </button>
              </div>
              <div className="text-right font-bold text-lg text-wc-gold">
                {user.totalPoints}
              </div>
            </div>
          ))}
          {(!leaderboard || leaderboard.length === 0) && (
            <div className="px-6 py-12 text-center text-white/30">
              No players yet. Be the first to predict!
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          {/* FIX: Use flex layout to fix double scrollbars */}
          <div
            className="bg-wc-dark border border-white/10 rounded-2xl w-full max-w-lg h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Shrink 0) */}
            <div className="px-5 sm:px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-wc-gold/20 flex items-center justify-center">
                  <Swords className="w-5 h-5 text-wc-gold" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{selectedUser.user.username}</h2>
                  <p className="text-xs text-white/40">Total Points: {selectedUser.totalPoints}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            {/* TABS (Shrink 0) */}
            <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-white/5 scrollbar-hide shrink-0">
              {selectedUser.rounds?.map((round, index) => {
                const isActive = index === activeRoundIndex;
                return (
                  <button
                    key={round.id}
                    onClick={() => setActiveRoundIndex(index)}
                    // FIX: Increased padding, whitespace-nowrap, flex-none
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap flex-none ${
                      isActive
                        ? "bg-wc-gold text-black shadow-lg"
                        : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    {round.name}
                  </button>
                );
              })}
            </div>

            {/* Modal Body (Flex 1, min-h-0 to allow scrolling inside) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-0">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12 text-white/30">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
                </div>
              ) : (
                (() => {
                  const currentRound = selectedUser.rounds?.[activeRoundIndex];
                  const currentMatches = currentRound?.matches;

                  if (!currentMatches || currentMatches.length === 0) {
                     return (
                       <div className="text-center py-12 text-white/30">
                         <p className="text-lg font-bold text-white/50">No matches found</p>
                       </div>
                     );
                  }

                  return currentMatches.map((pred) => {
                    const pointsMeta = getPointsLabel(pred.points, pred.isDoubled);
                    return (
                      <div
                        key={pred.id}
                        className={`rounded-xl border p-4 transition ${
                          pred.points !== null && pred.points > 0
                            ? "bg-white/[0.02] border-wc-gold/10"
                            : pred.points !== null && pred.points === 0
                            ? "bg-white/[0.02] border-red-500/10"
                            : "bg-white/[0.02] border-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[10px] sm:text-xs text-white/30 uppercase tracking-wider font-semibold">
                            {formatDate(pred.matchDate)}
                          </div>
                          <div className="flex items-center gap-2">
                            {pred.isDoubled && (
                              <span className="px-1.5 py-0.5 rounded bg-wc-gold/10 text-wc-gold text-[10px] font-bold flex items-center gap-1">
                                <Zap className="w-3 h-3 fill-wc-gold" /> 2x
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <span className="text-lg">{getFlag(pred.homeTeam)}</span>
                              <span className="font-bold text-sm truncate">{pred.homeTeam}</span>
                            </div>
                            <div className="text-xs font-bold text-white/20 shrink-0">VS</div>
                            <div className="flex-1 flex items-center gap-2 min-w-0 flex-row-reverse text-right">
                              <span className="text-lg">{getFlag(pred.awayTeam)}</span>
                              <span className="font-bold text-sm truncate">{pred.awayTeam}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            {pred.hasScore ? (
                              <div className="flex items-center gap-2">
                                <div className="text-center">
                                  <div className="text-xs text-white/30">Actual</div>
                                  <div className="font-bold text-sm">
                                    {pred.homeScore} - {pred.awayScore}
                                  </div>
                                </div>
                                <div className="text-white/10">|</div>
                                <div className="text-center">
                                  <div className="text-xs text-white/30">Predicted</div>
                                  {/* FIX: Use the flat predictedHome/away fields */}
                                  <div className="font-bold text-sm text-wc-gold">
                                    {pred.predictedHome ?? "-"} - {pred.predictedAway ?? "-"}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center">
                                <div className="text-xs text-white/30">Predicted</div>
                                <div className="font-bold text-sm text-wc-gold">
                                  {pred.predictedHome ?? "-"} - {pred.predictedAway ?? "-"}
                                </div>
                              </div>
                            )}
                            {pointsMeta && (
                              <div className={`px-3 py-1.5 rounded-lg border ${pointsMeta.bg} ${pointsMeta.border} text-xs font-bold ${pointsMeta.color} flex items-center gap-1`}>
                                <Star className="w-3 h-3 fill-current" />
                                {pointsMeta.text}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
