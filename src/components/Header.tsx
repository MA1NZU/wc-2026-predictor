"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { Trophy, Swords, BarChart3, Shield, LogOut, LogIn } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-wc-blue/90 backdrop-blur-md border-b border-wc-gold/30">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
          <Trophy className="w-6 h-6 text-wc-gold" />
          <span className="hidden sm:inline">RUNIT WC 2026</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-4">
          <Link href="/predict" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-white/10 text-sm font-medium transition">
            <Swords className="w-4 h-4" />
            <span className="hidden sm:inline">Predict</span>
          </Link>
          <Link href="/leaderboard" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-white/10 text-sm font-medium transition">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Leaderboard</span>
          </Link>
          {user?.isAdmin && (
            <Link href="/admin" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-white/10 text-sm font-medium transition">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          {user ? (
            <button onClick={logout} className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-wc-red/20 text-sm font-medium transition text-wc-red">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{user.username}</span>
            </button>
          ) : (
            <Link href="/login" className="flex items-center gap-1 px-3 py-2 rounded-lg bg-wc-gold text-wc-dark hover:bg-wc-gold/90 text-sm font-bold transition">
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
