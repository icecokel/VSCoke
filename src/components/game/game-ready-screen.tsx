"use client";

import { useState, useEffect } from "react";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { GameConstants } from "./game-constants";
import { getGameRanking, type GameHistory } from "@/services/score-service";

interface GameReadyScreenProps {
  onStart: () => void;
  isMobile: boolean;
}

const GameReadyScreen = ({ onStart, isMobile }: GameReadyScreenProps) => {
  const t = useTranslations("Game");
  const router = useCustomRouter();

  const [rows, setRows] = useState<number[][]>([]);
  const [topRanking, setTopRanking] = useState<GameHistory[]>([]);
  const [isRankingLoading, setIsRankingLoading] = useState(true);
  const rankBadges = ["🥇", "🥈", "🥉"];

  const onClickBack = () => {
    router.back();
  };

  useEffect(() => {
    const initialRows = Array.from({ length: 1 }, () =>
      Array.from({ length: 3 }, () => Math.floor(Math.random() * 5)),
    );
    setRows(initialRows);

    const interval = setInterval(() => {
      setRows(prev => {
        const newRow = Array.from({ length: 3 }, () => Math.floor(Math.random() * 5));
        const nextRows = [newRow, ...prev].slice(0, 7);
        return nextRows;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadRanking = async () => {
      setIsRankingLoading(true);
      const ranking = await getGameRanking("SKY_DROP");
      if (!isActive) return;
      setTopRanking(ranking.slice(0, 3));
      setIsRankingLoading(false);
    };

    loadRanking();

    return () => {
      isActive = false;
    };
  }, []);

  const getDisplayName = (player: GameHistory["user"]) => {
    const fullName = `${player.lastName ?? ""}${player.firstName ?? ""}`.trim();
    if (fullName) return fullName;
    return player.firstName || t("unknownPlayer");
  };

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-gray-900 text-white ${isMobile ? "p-2" : "p-4"}`}
    >
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-teal-400 mb-2">Sky Drop</h1>
        <p className="text-gray-400 text-sm">{t("start")}</p>
      </div>

      <div
        className="w-full max-w-xs aspect-[9/16] bg-slate-800 rounded-lg border-2 border-slate-700 mb-8 flex items-center justify-center overflow-hidden relative"
        style={{ maxHeight: "40vh" }}
      >
        {/* 떨어지는 블록 애니메이션 */}
        <div className="absolute inset-0 flex flex-col items-center pt-4 gap-2 opacity-50">
          {rows.map((row: number[], rowIndex: number) => (
            <div key={`row-${rowIndex}`} className="flex gap-2">
              {row.map((colorIdx: number, colIndex: number) => (
                <div
                  key={`block-${rowIndex}-${colIndex}`}
                  className="w-8 h-4 rounded-sm transition-all duration-500"
                  style={{
                    backgroundColor: `#${GameConstants.BLOCK_PALETTE[colorIdx].toString(16).padStart(6, "0")}`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-7 w-full max-w-xs rounded-xl border border-white/10 bg-black/30 px-4 py-3">
        <h2 className="mb-2 text-xs font-bold tracking-[0.2em] text-cyan-300">
          {t("leaderboardTitle")}
        </h2>

        {isRankingLoading ? (
          <p className="text-sm text-gray-400">{t("leaderboardLoading")}</p>
        ) : topRanking.length === 0 ? (
          <p className="text-sm text-gray-400">{t("leaderboardEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {topRanking.map((entry, index) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-sm">{rankBadges[index] ?? `#${index + 1}`}</span>
                  <span className="truncate text-sm text-white">{getDisplayName(entry.user)}</span>
                </div>
                <span className="text-sm font-bold text-amber-300">
                  {entry.score.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-4 w-full items-center">
        <Button
          onClick={onStart}
          size="lg"
          aria-label="Start Game"
          className="text-xl px-12 py-6 bg-teal-400 hover:bg-teal-500 text-black font-bold rounded-full transition-all hover:scale-105"
        >
          {t("start")}
        </Button>

        <Button
          onClick={onClickBack}
          variant="ghost"
          aria-label="Exit Game"
          className="text-gray-400 hover:text-white transition-colors"
        >
          {t("exit")}
        </Button>
      </div>
    </div>
  );
};

export default GameReadyScreen;
