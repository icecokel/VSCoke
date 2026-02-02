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
    // 화면 높이 전체 사용, 가로만 제한
    <div className="w-full max-w-[500px] h-[100dvh] mx-auto flex flex-col overflow-hidden px-2 pb-1">
      {/* Header - 32px 고정 */}
      <header className="h-8 flex items-center justify-between px-1 shrink-0">
        <h1 className="text-base font-bold tracking-tight">Wordle</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetGame}
          title="Restart Game"
          className="h-6 w-6 p-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </header>

      {/* Board - flex-1, 최소한의 패딩 */}
      <main className="flex-1 flex items-center justify-center min-h-0">
        <WordleBoard guesses={guesses} history={history} currentGuess={currentGuess} turn={turn} />
      </main>

      {/* Keyboard - 90px 고정 높이 */}
      <footer className="h-[90px] shrink-0">
        <WordleKeyboard onKey={handleKeyup} usedKeys={usedKeys} />
      </footer>
    </div>
  );
}
