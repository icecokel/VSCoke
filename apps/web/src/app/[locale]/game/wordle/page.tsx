"use client";

import { useEffect } from "react";
import { useWordle } from "@/hooks/use-wordle";
import { WordleBoard } from "@/components/wordle/wordle-board";
import { WordleKeyboard } from "@/components/wordle/wordle-keyboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import styles from "@/components/wordle/wordle.module.css";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { useTranslations } from "next-intl";

export default function WordlePage() {
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

  // 윈도우 키보드 이벤트 리스너
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("button, a, input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }

      const isAlphabeticKey = /^[A-Za-z]$/.test(e.key);
      if (e.key !== "Enter" && e.key !== "Backspace" && !isAlphabeticKey) return;

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
    <main className="flex h-full min-h-0 w-full min-w-0 items-center justify-center bg-background">
      <div className={styles.frame}>
        {/* Header */}
        <header className={`flex shrink-0 items-center justify-between px-4 py-3 ${styles.header}`}>
          <h1 className="text-xl font-bold tracking-tight" data-testid="wordle-title">
            Wordle
          </h1>
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
        <footer className={`shrink-0 px-2 pb-4 pt-2 ${styles.footer}`}>
          <WordleKeyboard onKey={handleKeyup} usedKeys={usedKeys} />
        </footer>
      </div>
    </main>
  );
}
