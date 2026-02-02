"use client";

import { useEffect } from "react";
import { useWordle } from "@/hooks/useWordle"; // Phase 1
import { WordleBoard } from "@/components/wordle/WordleBoard"; // Phase 2
import { WordleKeyboard } from "@/components/wordle/WordleKeyboard"; // Phase 2
import { toast } from "sonner"; // Sonner 사용
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function WordlePage() {
  const {
    currentGuess,
    guesses,
    history,
    isCorrect,
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
      // 보조키(Ctrl, Alt, Meta)가 눌린 상태면 무시
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
    <div className="container max-w-lg mx-auto py-8 px-4 flex flex-col min-h-screen">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Wordle</h1>
        <Button variant="ghost" size="icon" onClick={resetGame} title="Restart Game">
          <RefreshCw className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-between gap-8 pb-8">
        <div className="w-full flex justify-center">
          <WordleBoard
            guesses={guesses}
            history={history}
            currentGuess={currentGuess}
            turn={turn}
          />
        </div>

        <div className="w-full">
          <WordleKeyboard onKey={handleKeyup} usedKeys={usedKeys} />
        </div>
      </main>

      {/* 디버깅용 정답 표시 (개발 중에만 보임) */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-center text-xs text-muted-foreground mt-4">Debug Answer: {answer}</div>
      )}
    </div>
  );
}
