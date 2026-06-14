"use client";

import Link from "next/link";
import { Trophy, Swords, BarChart3, Calendar, Star } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-wc-gold/20 mb-6">
          <Trophy className="w-10 h-10 text-wc-gold" />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-wc-gold to-white">
          RUNIT WC 2026
        </h1>
        <p className="text-xl text-white/70 max-w-2xl mx-auto">
          Predict every match. Climb the leaderboard. Win bragging rights.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <FeatureCard icon={<Swords className="w-8 h-8 text-wc-red" />} title="Make Predictions" description="Guess the exact score for every World Cup 2026 match. Perfect score = 6 pts, correct outcome = 3 pts." href="/predict" />
        <FeatureCard icon={<BarChart3 className="w-8 h-8 text-wc-gold" />} title="Live Leaderboard" description="Track your points in real-time as matches go live. Watch your rank climb with every correct call." href="/leaderboard" />
        <FeatureCard icon={<Calendar className="w-8 h-8 text-wc-blue" />} title="Matchday Doubler" description="Use your one double-per-round wisely. Pick the match you're most confident about and 2x the points." href="/predict" />
      </div>

      <div className="mt-16 text-center">
        <div className="inline-block p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
          <h2 className="text-2xl font-bold mb-2">Scoring System</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-wc-gold/10 border border-wc-gold/20">
              <div className="text-2xl font-bold text-wc-gold mb-1">6 pts</div>
              <div className="text-white/80">Perfect Score</div>
              <div className="text-white/50 text-xs mt-1">Exact result</div>
            </div>
            <div className="p-4 rounded-xl bg-wc-blue/20 border border-wc-blue/30">
              <div className="text-2xl font-bold text-wc-blue mb-1">3 pts</div>
              <div className="text-white/80">Correct Outcome</div>
              <div className="text-white/50 text-xs mt-1">Right winner / draw</div>
            </div>
            <div className="p-4 rounded-xl bg-wc-red/10 border border-wc-red/20">
              <div className="text-2xl font-bold text-wc-red mb-1">0 pts</div>
              <div className="text-white/80">Wrong Call</div>
              <div className="text-white/50 text-xs mt-1">Better luck next time</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 max-w-2xl mx-auto text-center text-white/40 text-sm">
        <p className="flex items-center justify-center gap-2">
          <Star className="w-4 h-4 text-wc-gold" />
          One double pick per round. Choose the match you're most confident about.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href: string }) {
  return (
    <Link href={href} className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-wc-gold/30 transition duration-300">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2 group-hover:text-wc-gold transition">{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{description}</p>
    </Link>
  );
}
