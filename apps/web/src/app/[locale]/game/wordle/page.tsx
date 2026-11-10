"use client";

import { useEffect, useRef } from "react";
import { useWordle } from "@/hooks/use-wordle";
import { WordleBoard } from "@/components/wordle/wordle-board";
import { WordleKeyboard } from "@/components/wordle/wordle-keyboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import styles from "@/components/wordle/wordle.module.css";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { useTranslations } from "next-intl";
import { isIgnoredWordleKey } from "@/lib/wordle/wordle-key-guard";
import { CustomLink } from "@/components/custom-link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function WordlePage() {
  const gameRef = useRef<HTMLElement>(null);
  const tShare = useTranslations("Share");
  const tGame = useTranslations("Game");
  const {
    currentGuess,
    guesses,
    history,
    turn,
    gameStatus,
    usedKeys,
    handleKeyup,
    resetGame,
    answer,
    isLoading,
  } = useWordle();

  useEffect(() => {
    gameRef.current?.focus({ preventScroll: true });
  }, []);

  // 윈도우 키보드 이벤트 리스너
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (isIgnoredWordleKey(e)) return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("button, a, input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }

      e.preventDefault();
      handleKeyup(e.key);
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [handleKeyup]);

  // 게임 종료 시 자동 알림
  useEffect(() => {
    if (gameStatus === "won") {
      toast.success(tGame("wordleWonTitle"), { description: tGame("wordleWonDescription") });
    } else if (gameStatus === "lost") {
      toast.error(tGame("wordleLostTitle"), {
        description: tGame("wordleLostDescription", { answer }),
      });
    }
  }, [gameStatus, answer, tGame]);

  return (
    <main
      ref={gameRef}
      tabIndex={-1}
      className="flex h-full min-h-0 w-full min-w-0 items-center justify-center bg-background"
    >
      <div className={styles.frame} data-testid="wordle-frame">
        {/* Header */}
        <header
          className={`flex shrink-0 flex-wrap items-center justify-between gap-y-2 px-4 py-3 ${styles.header}`}
        >
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                  <CustomLink href="/game" aria-label={tGame("viewOtherGames")}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </CustomLink>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tGame("viewOtherGames")}</TooltipContent>
            </Tooltip>
            <h1 className="text-xl font-bold tracking-tight" data-testid="wordle-title">
              Wordle
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <ShareLinkButton
              variant="ghost"
              size="icon"
              iconOnly
              text={tShare("wordleText")}
              label={tShare("share")}
              className="max-md:h-8 max-md:w-8"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={event => {
                event.currentTarget.blur();
                void resetGame();
              }}
              title={tGame("restart")}
              aria-label={tGame("restart")}
              data-testid="wordle-header-restart"
              className="h-8 w-8"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          {gameStatus !== "playing" && (
            <div role="status" data-testid="wordle-result" className="w-full text-center text-sm">
              <p className="font-semibold">
                {tGame(gameStatus === "won" ? "wordleWonTitle" : "wordleLostTitle")}
              </p>
              <p className="text-xs text-muted-foreground">
                {gameStatus === "won"
                  ? tGame("wordleWonDescription")
                  : tGame("wordleLostDescription", { answer })}
              </p>
            </div>
          )}
        </header>

        {/* Board - flex-1로 남은 공간 채움 */}
        <div className={styles.boardArea}>
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p data-testid="wordle-loading" aria-live="polite">
                {tGame("loading")}
              </p>
            </div>
          ) : (
            <WordleBoard
              guesses={guesses}
              history={history}
              currentGuess={currentGuess}
              turn={turn}
            />
          )}
        </div>

        {/* Keyboard - 하단 고정 */}
        <footer className={`shrink-0 px-2 ${styles.footer}`}>
          <WordleKeyboard onKey={handleKeyup} usedKeys={usedKeys} />
        </footer>
      </div>
    </main>
  );
}
