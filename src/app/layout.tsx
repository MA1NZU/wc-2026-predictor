import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 1. Import the new Context
import { GameProvider } from "@/context/GameContext"; 

import { Header } from "@/components/Header";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RUNIT WC 2026",
  description: "Predict World Cup 2026 scores and compete with friends!",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {/* 2. Wrap the app in GameProvider so all pages share real-time data */}
          <GameProvider>
            <Header />
            <main className="min-h-screen bg-gradient-to-b from-wc-dark via-[#0f172a] to-wc-dark">
              {children}
            </main>
          </GameProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
