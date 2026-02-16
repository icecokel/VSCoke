"use client";

import { useTranslations } from "next-intl";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { useEffect } from "react";

import { ChevronRight } from "lucide-react";

export default function GameDashboard() {
  const t = useTranslations("Game");
  const { push, prefetch } = useCustomRouter();

  const games = [
    {
      id: "sky-drop",
      title: "Sky Drop",
      description: t("skyDropDesc"),
      route: "/game/sky-drop",
    },
    {
      id: "fish-drift",
      title: "Fish Drift",
      description: t("fishDriftDesc"),
      route: "/game/fish-drift",
    },
    {
      id: "doom",
      title: t("doomTitle"),
      description: t("doomDesc"),
      route: "/doom",
    },
    {
      id: "wordle",
      title: t("wordleTitle"),
      description: t("wordleDesc"),
      route: "/game/wordle",
    },
  ];

  useEffect(() => {
    ["/game/sky-drop", "/game/fish-drift", "/doom", "/game/wordle"].forEach(path => prefetch(path));
  }, [prefetch]);

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-start md:justify-center bg-slate-900 px-4 py-8 md:p-4">
      <h1 className="mb-6 md:mb-12 text-2xl md:text-5xl font-bold text-white tracking-widest uppercase glow-text">
        Game Center
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 w-full max-w-4xl">
        {games.map(game => (
          <button
            key={game.id}
            onClick={() => push(game.route)}
            onMouseEnter={() => prefetch(game.route)}
            onFocus={() => prefetch(game.route)}
            className="group relative flex w-full md:w-64 h-24 md:h-64 flex-row md:flex-col items-center justify-between md:justify-center rounded-2xl bg-slate-800 p-4 md:p-6 transition-all duration-300 hover:bg-slate-700 hover:scale-105 border-2 border-slate-700 hover:border-green-300 text-left md:text-center"
          >
            <div className="flex flex-col md:items-center">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2 leading-tight">
                {game.title}
              </h2>
              <p className="text-xs md:text-base text-gray-400 group-hover:text-gray-200 transition-colors line-clamp-1 md:line-clamp-3">
                {game.description}
              </p>
            </div>
            {/* 모바일에서만 보이는 화살표 아이콘 */}
            <div className="md:hidden text-green-300">
              <ChevronRight className="w-6 h-6" />
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
