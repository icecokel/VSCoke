import { cn } from "@/lib/utils";
import { LetterStatus } from "@/lib/wordle/wordle-logic";
import { Delete } from "lucide-react";

interface WordleKeyboardProps {
  onKey: (key: string) => void;
  usedKeys: Record<string, LetterStatus>;
}

export function WordleKeyboard({ onKey, usedKeys }: WordleKeyboardProps) {
  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Enter", "Z", "X", "C", "V", "B", "N", "M", "Backspace"],
  ];

  return (
    <div className="w-full max-w-[500px] mx-auto flex flex-col gap-2 px-2">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-1.5 touch-manipulation">
          {row.map(key => {
            const status = usedKeys[key];
            const isSpecial = key.length > 1;

            return (
              <button
                key={key}
                onClick={() => onKey(key)}
                className={cn(
                  "flex items-center justify-center rounded font-bold uppercase transition-all active:scale-95 select-none",
                  isSpecial
                    ? "px-3 py-4 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                    : "flex-1 py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600",
                  status === "absent" &&
                    "bg-zinc-500 dark:bg-zinc-600 text-white hover:bg-zinc-600 dark:hover:bg-zinc-500",
                  status === "present" &&
                    "bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500",
                  status === "correct" &&
                    "bg-green-500 text-white hover:bg-green-600 border-green-500",
                  "h-14 sm:h-16",
                )}
              >
                {key === "Backspace" ? <Delete className="w-6 h-6" /> : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
