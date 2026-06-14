"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, Loader2, Crown, X, Swords, Zap, Star } from "lucide-react";

type LeaderboardUser = {
  id: string;
  username: string;
  totalPoints: number;
  predictionsCount: number;
};

type PredictionDetail = {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  homeScore: number | null;
  awayScore: number | null;
  isLive: boolean;
  predictedHome: number;
  predictedAway: number;
  isDoubled: boolean;
  basePoints: number | null;
  points: number | null;
  hasScore: boolean;
};

type UserDetail = {
  user: { id: string; username: string };
  totalPoints: number;
  predictionsCount: number;
  predictions: PredictionDetail[];
};

function getFlag(team: string) {
  const flags: Record<string, string> = {
    FRANCE: "🇫🇷", GERMANY: "🇩🇪", ENGLAND: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", SPAIN: "🇪🇸", PORTUGAL: "🇵🇹",
    NETHERLANDS: "🇳🇱", BELGIUM: "🇧🇪", ITALY: "🇮🇹", CROATIA: "🇭🇷", DENMARK: "🇩🇰",
    SWITZERLAND: "🇨🇭", POLAND: "🇵🇱", WALES: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", SCOTLAND: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", UKRAINE: "🇺🇦",
    AUSTRIA: "🇦🇹", SERBIA: "🇷🇸", SWEDEN: "🇸🇪", NORWAY: "🇳🇴", CZECHIA: "🇨🇿",
    CZECH: "🇨🇿", HUNGARY: "🇭🇺", ROMANIA: "🇷🇴", SLOVAKIA: "🇸🇰", SLOVENIA: "🇸🇮",
    GREECE: "🇬🇷", TURKEY: "🇹🇷", IRELAND: "🇮🇪", NORTHERN: "🇬🇧", BOSNIA: "🇧🇦",
    FINLAND: "🇫🇮", RUSSIA: "🇷🇺", ISRAEL: "🇮🇱",
    ARGENTINA: "🇦🇷", BRAZIL: "🇧🇷", URUGUAY: "🇺🇾", COLOMBIA: "🇨🇴", ECUADOR: "🇪🇨",
    CHILE: "🇨🇱", PERU: "🇵🇪", PARAGUAY: "🇵🇾", BOLIVIA: "🇧🇴", VENEZUELA: "🇻🇪",
    USA: "🇺🇸", CANADA: "🇨🇦", MEXICO: "🇲🇽", PANAMA: "🇵🇦", COSTA: "🇨🇷",
    RICA: "🇨🇷", HONDURAS: "🇭🇳", JAMAICA: "🇯🇲", EL: "🇸🇻", SALVADOR: "🇸🇻",
    GUATEMALA: "🇬🇹", HAITI: "🇭🇹", TRINIDAD: "🇹🇹", CUBA: "🇨🇺", CURACAO: "🇨🇼",
    NICARAGUA: "🇳🇮", BERMUDA: "🇧🇲",
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
    "NEW ZEALAND": "🇳🇿", FIJI: "🇫🇯", PAPUA: "🇵🇬", NEWCALEDONIA: "🇳🇨", TAHITI: "🇵🇫",
    SAMOA: "🇼🇸", VANUATU: "🇻🇺", SOLOMON: "🇸🇧",
  };
  const upper = team.toUpperCase().trim();
  return flags[upper] || flags[upper.slice(0, 3)] || "🏳️";
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
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, []);

  const openUserDetail = async (userId: string) => {
    setLoadingDetail(true);
    const res = await fetch(`/api/leaderboard/${userId}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setSelectedUser(data);
    }
    setLoadingDetail(false);
  };

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
                {index === 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-wc-gold/20 text-wc-gold uppercase tracking-wider">#1</span>
                )}
                <p className="text-xs text-white/30 mt-0.5">{user.predictionsCount} predictions</p>
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

      {/* Detail Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-wc-dark border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-wc-gold/20 flex items-center justify-center">
                  <Swords className="w-5 h-5 text-wc-gold" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{selectedUser.user.username}</h2>
                  <p className="text-xs text-white/40">
                    {selectedUser.predictionsCount} predictions • {selectedUser.totalPoints} pts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-4 sm:p-5 space-y-3">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12 text-white/30">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
                </div>
              ) : selectedUser.predictions.length === 0 ? (
                <div className="text-center py-12 text-white/30">No predictions yet</div>
              ) : (
                selectedUser.predictions.map((pred) => {
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
                          {pred.isLive && (
                            <span className="px-1.5 py-0.5 rounded bg-wc-red/10 text-wc-red text-[10px] font-bold flex items-center gap-1">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-wc-red opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-wc-red"></span>
                              </span>
                              LIVE
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        {/* Teams */}
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

                        {/* Predictions & Points */}
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
                                <div className="font-bold text-sm text-wc-gold">
                                  {pred.predictedHome} - {pred.predictedAway}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="text-xs text-white/30">Predicted</div>
                              <div className="font-bold text-sm text-wc-gold">
                                {pred.predictedHome} - {pred.predictedAway}
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
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
