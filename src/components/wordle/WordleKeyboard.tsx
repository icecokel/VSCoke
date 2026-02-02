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
    <div className="w-full max-w-[500px] mx-auto flex flex-col gap-1.5">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-1 touch-manipulation">
          {row.map(key => {
            const status = usedKeys[key];
            const isSpecial = key.length > 1;

            return (
              <button
                key={key}
                onClick={() => onKey(key)}
                className={cn(
                  "flex items-center justify-center rounded font-bold uppercase transition-all active:scale-95 select-none",
                  "h-12 sm:h-14 text-xs sm:text-sm",
                  isSpecial ? "flex-[1.5] px-2" : "flex-1",
                  // 기본 배경색
                  !status &&
                    "bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-foreground",
                  // 상태별 배경색
                  status === "absent" && "bg-zinc-500 dark:bg-zinc-600 text-white",
                  status === "present" && "bg-yellow-500 text-white",
                  status === "correct" && "bg-green-500 text-white",
                )}
              >
                {key === "Backspace" ? (
                  <Delete className="w-5 h-5" />
                ) : key === "Enter" ? (
                  <span className="text-[10px] sm:text-xs">ENTER</span>
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
