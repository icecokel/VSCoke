import { cn } from "@/lib/utils";
import { LetterStatus } from "@/lib/wordle/wordle-logic";

interface WordleTileProps {
  letter?: string;
  status?: LetterStatus;
}

export function WordleTile({ letter, status }: WordleTileProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center w-full aspect-square border-2 text-3xl font-bold uppercase select-none transition-colors duration-200",
        "flex items-center justify-center w-full aspect-square border-2 text-3xl font-bold uppercase select-none transition-colors duration-200",
        // Empty
        !status && !letter && "border-gray-200 dark:border-gray-700 bg-transparent text-foreground",
        // Typing
        !status &&
          letter &&
          "border-gray-400 dark:border-gray-500 bg-transparent text-foreground animate-pulse",
        // Status Colors
        status === "absent" && "border-transparent bg-zinc-500 text-white",
        status === "present" && "border-transparent bg-yellow-500 text-white",
        status === "correct" && "border-transparent bg-green-500 text-white",
      )}
    >
      {letter}
    </div>
  );
}
