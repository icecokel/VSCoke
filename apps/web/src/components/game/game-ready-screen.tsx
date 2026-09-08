"use client";

import { useState, useEffect } from "react";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { useTranslations } from "next-intl";
import { ArrowLeft, Play, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameConstants } from "./game-constants";
import { getGameRanking, type GameHistory } from "@/services/score-service";
import { toast } from "sonner";

interface GameReadyScreenProps {
  onStart: () => void;
  isReady: boolean;
}

export const GameReadyScreen = ({ onStart, isReady }: GameReadyScreenProps) => {
  const t = useTranslations("Game");
  const router = useCustomRouter();
  const [topRanking, setTopRanking] = useState<GameHistory[]>([]);
  const [isRankingLoading, setIsRankingLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    const loadRanking = async () => {
      try {
        const ranking = await getGameRanking("SKY_DROP");
        if (isActive) setTopRanking(ranking.slice(0, 3));
      } catch {
        if (isActive) {
          toast.error(t("apiUnavailable"), { id: "api-unavailable" });
          setTopRanking([]);
        }
      } finally {
        if (isActive) setIsRankingLoading(false);
      }
    };
    void loadRanking();
    return () => {
      isActive = false;
    };
  }, [t]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="sky-drop-ready">
      <div className="my-auto flex w-full flex-col items-center gap-5 py-5">
        <header className="text-center">
          <p className="mb-2 text-[10px] font-semibold tracking-[0.25em] text-muted-foreground">
            {t("skyDrop.tagline")}
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-teal-400">
            {t("skyDrop.title")}
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
            {t("skyDrop.rules")}
          </p>
        </header>
        <div
          className="grid w-full max-w-52 grid-cols-3 gap-2 rounded-xl border border-border bg-muted/30 p-4"
          aria-hidden="true"
        >
          {[0, 3, 2, 2, 4, 0, 3, 3, 3].map((color, index) => (
            <span
              key={index}
              className="flex h-6 items-center justify-center rounded text-xs text-gray-900"
              style={{ backgroundColor: GameConstants.BLOCK_PALETTE[color] }}
            >
              {GameConstants.BLOCK_SYMBOLS[color]}
            </span>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{t("skyDrop.keyboardHint")}</p>
        <section
          className="w-full max-w-xs rounded-xl border border-border bg-card p-4"
          aria-labelledby="sky-drop-ranking"
        >
          <h2
            id="sky-drop-ranking"
            className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground"
          >
            <Trophy className="size-4 text-yellow-500" aria-hidden="true" />
            {t("leaderboardTitle")}
          </h2>
          {isRankingLoading ? (
            <p className="text-sm text-muted-foreground">{t("leaderboardLoading")}</p>
          ) : topRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("leaderboardEmpty")}</p>
          ) : (
            <ol className="space-y-2">
              {topRanking.map(entry => (
                <li
                  key={`${entry.rank}-${entry.createdAt}`}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="w-5 font-mono text-muted-foreground">{entry.rank}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {entry.user.displayName.trim() || t("unknownPlayer")}
                  </span>
                  <span className="font-semibold text-yellow-500 tabular-nums">
                    {entry.score.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Button
            type="button"
            onClick={onStart}
            disabled={!isReady}
            size="lg"
            data-testid="game-start-button"
            className="min-h-12 rounded-xl bg-teal-400 text-base font-semibold text-gray-900 hover:bg-teal-500"
          >
            <Play aria-hidden="true" />
            {t("start")}
          </Button>
          <Button
            type="button"
            onClick={() => router.push("/game")}
            variant="ghost"
            data-testid="game-exit-button"
            className="min-h-11 text-muted-foreground"
          >
            <ArrowLeft aria-hidden="true" />
            {t("exit")}
          </Button>
        </div>
      </div>
    </div>
  );
};
