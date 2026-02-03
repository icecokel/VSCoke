import { LetterStatus } from "@/lib/wordle/wordle-logic";
import { WordleTile } from "./WordleTile";

interface WordleBoardProps {
  guesses: string[];
  history: LetterStatus[][];
  currentGuess: string;
  turn: number;
}

export function WordleBoard({ guesses, history, currentGuess, turn }: WordleBoardProps) {
  const emptyRows = Math.max(0, 5 - turn);

  return (
    // 보드: 높이 기준 5:6 비율, 최소 너비 220px (타일 40px * 5 + gap)
    <div className="h-full max-h-full min-w-[220px] mx-auto" style={{ aspectRatio: "5/6" }}>
      <div className="h-full w-full grid grid-rows-6 gap-1.5">
        {/* 1. Past Guesses (Completed) */}
        {history.map((rowStatus, i) => {
          if (i >= turn) return null;
          const guess = guesses[i];

          return (
            <div key={i} className="grid grid-cols-5 gap-1.5">
              {guess.split("").map((letter, j) => (
                <WordleTile key={j} letter={letter} status={rowStatus[j]} />
              ))}
            </div>
          );
        })}

        {/* 2. Current Row (Typing) */}
        {turn < 6 && (
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => {
              const letter = currentGuess[i];
              return <WordleTile key={i} letter={letter} />;
            })}
          </div>
        )}

        {/* 3. Empty Rows (Future) */}
        {Array.from({ length: emptyRows }).map((_, i) => (
          <div key={`empty-${i}`} className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 5 }).map((_, j) => (
              <WordleTile key={j} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
