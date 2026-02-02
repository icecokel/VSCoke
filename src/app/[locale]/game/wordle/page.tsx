"use client";

import { useEffect } from "react";
import { useWordle } from "@/hooks/useWordle";
import { WordleBoard } from "@/components/wordle/WordleBoard";
import { WordleKeyboard } from "@/components/wordle/WordleKeyboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function WordlePage() {
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

  return (
    <div className="container max-w-lg mx-auto py-4 px-4 flex flex-col min-h-[calc(100dvh-48px)]">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Wordle</h1>
        <Button variant="ghost" size="icon" onClick={resetGame} title="Restart Game">
          <RefreshCw className="w-5 h-5" />
        </Button>
      </header>

      {/* Board */}
      <main className="flex-1 flex items-center justify-center mb-4">
        <WordleBoard guesses={guesses} history={history} currentGuess={currentGuess} turn={turn} />
      </main>

      {/* Keyboard */}
      <footer className="mt-auto">
        <WordleKeyboard onKey={handleKeyup} usedKeys={usedKeys} />
      </footer>

      {/* 디버깅용 정답 표시 */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-center text-xs text-muted-foreground mt-2">Debug: {answer}</div>
      )}
    </div>
  );
}
