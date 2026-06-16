import { LetterStatus } from "@/lib/wordle/wordle-logic";
import { WordleTile } from "./wordle-tile";

interface WordleBoardProps {
  guesses: string[];
  history: LetterStatus[][];
  currentGuess: string;
  turn: number;
}

export function WordleBoard({ guesses, history, currentGuess, turn }: WordleBoardProps) {
  return (
    // 보드 컨테이너: 높이 기준 5:6 비율 유지
    <div className="h-full max-h-full min-w-[220px] mx-auto" style={{ aspectRatio: "5/6" }}>
      {/* 6줄 보드를 하나의 div로 묶어 고정 gap 유지 */}
      <div className="h-full w-full grid grid-rows-6 gap-2">
        {/* 모든 6줄을 렌더링 (gap은 항상 동일) */}
        {Array.from({ length: 6 }).map((_, rowIndex) => {
          // 완료된 행 (결과 표시)
          if (rowIndex < turn) {
            const guess = guesses[rowIndex];
            const rowStatus = history[rowIndex];
            return (
              <div key={rowIndex} className="grid grid-cols-5 gap-2">
                {guess.split("").map((letter, j) => (
                  <WordleTile key={j} letter={letter} status={rowStatus[j]} index={j} />
                ))}
              </div>
            );
          }

          // 현재 입력 중인 행
          if (rowIndex === turn) {
            return (
              <div key={rowIndex} className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <WordleTile key={j} letter={currentGuess[j]} />
                ))}
              </div>
            );
          }

          // 빈 행 (미래)
          return (
            <div key={rowIndex} className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <WordleTile key={j} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
