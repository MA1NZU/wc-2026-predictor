"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { refresh } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      await refresh();
      window.location.href = "/predict";
    } else {
      const data = await res.json();
      setError(data.error || "Login failed");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
        <h1 className="text-2xl font-bold mb-6 text-center">Welcome Back</h1>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-wc-red/20 text-wc-red text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-wc-gold focus:outline-none transition"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-wc-gold text-wc-dark font-bold hover:bg-wc-gold/90 transition"
          >
            Sign In
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-white/50">
          Don't have an account?{" "}
          <Link href="/register" className="text-wc-gold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
