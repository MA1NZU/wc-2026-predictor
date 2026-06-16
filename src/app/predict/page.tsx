"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useGameContext } from "@/context/GameContext";
import { Swords, Lock, Star, Save, Loader2, CheckCircle2, XCircle, Medal, Zap, Clock, Trophy } from "lucide-react";

type MatchType = {
  id: string; homeTeam: string; awayTeam: string; matchDate: string;
  homeScore: number | null; awayScore: number | null;
  prediction: { homeScore: number; awayScore: number } | null;
  doublePick: boolean; points: number | null; isLive?: boolean;
};
type RoundType = { id: string; name: string; status: string; matches: MatchType[] };

function getFlag(team: string) {
  if (!team) return "🏳️";
  const flags: Record<string, string> = {  FRANCE: "🇫🇷", GERMANY: "🇩🇪", ENGLAND: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", SPAIN: "🇪🇸", PORTUGAL: "🇵🇹",
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
    SAMOA: "🇼🇸", VANUATU: "🇻🇺", SOLOMON: "🇸🇧" };
  const upper = team.toUpperCase().trim();
  return flags[upper] || flags[upper.slice(0, 3)] || "🏳️";
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
  const { user, loading: authLoading } = useAuth();
  const { myRounds, loading: contextLoading } = useGameContext();
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string }>>({});
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // FIX: Reliable sync for inputs
  useEffect(() => {
    if (myRounds && myRounds.length > 0) {
      const rounds = myRounds as RoundType[];
      if (!activeTab) setActiveTab(rounds[0].id);
      setInputs(prev => {
        const next = { ...prev };
        rounds.forEach(r => r.matches.forEach(m => {
          if (m.prediction && !next[m.id]) {
            next[m.id] = { home: String(m.prediction.homeScore), away: String(m.prediction.awayScore) };
          }
        }));
        return next;
      });
    }
  }, [myRounds, activeTab]);

  const savePrediction = async (matchId: string) => {
    const inp = inputs[matchId];
    if (!inp || inp.home === "" || inp.away === "") return;

    setSaving(s => ({ ...s, [matchId]: true }));
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, homeScore: Number(inp.home), awayScore: Number(inp.away) }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      // Context onSnapshot will auto-update the UI
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(s => ({ ...s, [matchId]: false }));
    }
  };

  const setDoublePick = async (roundId: string, matchId: string) => {
    const res = await fetch("/api/double-pick", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roundId, matchId }),
    });
    if (!res.ok) alert("Failed to set double pick");
  };

  if (authLoading || contextLoading) return <div className="p-24 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto" /> Loading...</div>;
  if (!user) return <div className="p-24 text-center"><p>Please log in.</p><a href="/login" className="text-yellow-400 underline">Login</a></div>;

  const rounds = myRounds as RoundType[] | undefined;
  const activeRound = rounds?.find(r => r.id === activeTab) || rounds?.[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Your Predictions</h1>
      {rounds && rounds.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {rounds.map(r => (
            <button key={r.id} onClick={() => setActiveTab(r.id)} className={`px-4 py-2 rounded-xl ${r.id === activeTab ? 'bg-yellow-400 text-black' : 'bg-white/10'}`}>{r.name}</button>
          ))}
        </div>
      )}
      {activeRound && (
        <div className="grid gap-4">
          {activeRound.matches.map(m => {
            const inp = inputs[m.id] || { home: "", away: "" };
            const isLocked = m.isLive || activeRound.status === "LIVE" || activeRound.status === "FINISHED";
            const meta = getPointsLabel(m.points, m.doublePick);
            return (
              <div key={m.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex justify-between mb-3">
                  <span className="text-sm text-white/40">{new Date(m.matchDate).toLocaleDateString()}</span>
                  {meta && <span className={`px-2 py-1 rounded text-xs ${meta.bg} ${meta.color}`}>{meta.text}</span>}
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold flex items-center gap-2">{getFlag(m.homeTeam)} {m.homeTeam}</span>
                  <span className="font-mono text-xl">{isLocked ? `${m.homeScore} - ${m.awayScore}` : "VS"}</span>
                  <span className="font-bold flex items-center gap-2">{m.awayTeam} {getFlag(m.awayTeam)}</span>
                </div>
                {!isLocked ? (
                  <div className="flex gap-2 justify-end items-center">
                    <input type="number" value={inp.home} onChange={e => setInputs({...inputs, [m.id]: {...inp, home: e.target.value}})} className="w-14 p-2 text-center bg-black/50 rounded border border-white/20" />
                    <span>-</span>
                    <input type="number" value={inp.away} onChange={e => setInputs({...inputs, [m.id]: {...inp, away: e.target.value}})} className="w-14 p-2 text-center bg-black/50 rounded border border-white/20" />
                    <button onClick={() => savePrediction(m.id)} disabled={saving[m.id]} className="px-4 py-2 bg-yellow-400 text-black font-bold rounded disabled:opacity-50 flex items-center gap-2">
                      {saving[m.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                    </button>
                    <button onClick={() => setDoublePick(activeRound.id, m.id)} className={`p-2 rounded border ${m.doublePick ? 'border-yellow-400 text-yellow-400' : 'border-white/20'}`}><Star className="w-5 h-5" /></button>
                  </div>
                ) : <div className="text-center text-white/30 text-sm">Predictions Locked</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
