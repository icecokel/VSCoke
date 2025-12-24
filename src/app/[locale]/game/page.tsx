"use client";

import { useTranslations } from "next-intl";
import { useCustomRouter } from "@/hooks/use-custom-router";

export default function GameDashboard() {
  const t = useTranslations("Game");
  const router = useCustomRouter();

  const games = [
    {
      id: "sky-drop",
      title: "Sky Drop",
      description: t("start"), // "Start Game" or similar description from locale
      icon: "🎮",
      route: "/game/sky-drop",
    },
  ];

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-900 p-4">
      <h1 className="mb-12 text-5xl font-bold text-white tracking-widest uppercase glow-text">
        Game Center
      </h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {games.map(game => (
          <button
            key={game.id}
            onClick={() => router.push(game.route)}
            className="group relative flex h-64 w-64 flex-col items-center justify-center rounded-2xl bg-slate-800 p-6 transition-all duration-300 hover:bg-slate-700 hover:scale-105 hover:shadow-[0_0_30px_rgba(78,205,196,0.5)] border-2 border-slate-700 hover:border-[#4ECDC4]"
          >
            <div className="text-6xl mb-4 group-hover:animate-bounce">{game.icon}</div>
            <h2 className="text-2xl font-bold text-white mb-2">{game.title}</h2>
            <p className="text-gray-400 group-hover:text-gray-200 transition-colors">
              {game.description}
            </p>
          </button>
        ))}
      </div>
    </main>
  );
}
