"use client";

import { useEffect } from "react";
import { useWordle } from "@/hooks/use-wordle";
import { WordleBoard } from "@/components/wordle/wordle-board";
import { WordleKeyboard } from "@/components/wordle/wordle-keyboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function WordlePage() {
  const isMobile = useIsMobile();
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
      handleKeyup(e.key);
    };

    window.addEventListener("keyup", listener);
    return () => window.removeEventListener("keyup", listener);
  }, [handleKeyup]);

  // 게임 종료 시 자동 알림
  useEffect(() => {
    if (gameStatus === "won") {
      toast.success("축하합니다! 🎉", { description: "정답을 맞추셨습니다!" });
    } else if (gameStatus === "lost") {
      toast.error("아쉽네요 😭", { description: `정답은 ${answer}였습니다.` });
    }
  }, [gameStatus, answer]);

  // 조건부 컨테이너 스타일
  const containerStyle = isMobile
    ? {
        position: "fixed" as const,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 50,
      }
    : {
        // 데스크탑: 가로 최대 600px, 높이는 화면에 맞춤
        width: "min(600px, 90vw)",
        height: "min(90vh, 800px)",
      };

  return (
    <main className="flex h-full w-full items-center justify-center bg-background">
      <div
        className={`relative flex flex-col overflow-hidden bg-background ${!isMobile ? "rounded-xl border border-border" : ""}`}
        style={containerStyle}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 shrink-0">
          <h1 className="text-xl font-bold tracking-tight">Wordle</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={resetGame}
            title="Restart Game"
            className="h-8 w-8"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </header>

        {/* Board - flex-1로 남은 공간 채움 */}
        <div className="flex-1 flex items-center justify-center min-h-0 px-4">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p>Loading word...</p>
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
        <footer className="shrink-0 px-2 pb-4 pt-2">
          <WordleKeyboard onKey={handleKeyup} usedKeys={usedKeys} />
        </footer>
      </div>
    </main>
  );
}
