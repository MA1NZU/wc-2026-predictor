import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "World Cup 2026 Predictor",
  description: "Predict World Cup 2026 scores and compete with friends!",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Header />
          <main className="min-h-screen bg-gradient-to-b from-wc-dark via-[#0f172a] to-wc-dark">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
