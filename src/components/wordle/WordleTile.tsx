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
        {
          "border-gray-200 dark:border-gray-700 bg-transparent text-foreground": !status && !letter, // Empty
          "border-gray-400 dark:border-gray-500 bg-transparent text-foreground animate-pulse":
            !status && letter, // Typing
          "border-transparent bg-zinc-500 text-white": status === "absent",
          "border-transparent bg-yellow-500 text-white": status === "present",
          "border-transparent bg-green-500 text-white": status === "correct",
        },
      )}
    >
      {letter}
    </div>
  );
}
