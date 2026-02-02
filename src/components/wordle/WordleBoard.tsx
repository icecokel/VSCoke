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
    <div className="grid grid-rows-6 gap-1.5 w-full max-w-[350px] mx-auto">
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
  );
}
