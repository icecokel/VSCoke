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
    // 키보드 높이: 최대 160px, 최소 키 36px * 3행 + gap = 약 120px
    <div className="w-full h-[min(30vh,160px)] min-h-[120px] flex flex-col gap-1.5">
      {rows.map((row, i) => (
        <div key={i} className="flex-1 flex justify-center gap-1 touch-manipulation min-h-9">
          {row.map(key => {
            const status = usedKeys[key];
            const isSpecial = key.length > 1;

            return (
              <button
                key={key}
                onClick={() => onKey(key)}
                className={cn(
                  "h-full min-h-9 flex items-center justify-center rounded font-bold uppercase transition-all active:scale-95 select-none",
                  "text-xs sm:text-sm",
                  isSpecial ? "flex-[1.5] px-1 sm:px-2" : "flex-1",
                  // 기본 배경색
                  !status && "bg-gray-700 hover:bg-gray-600 text-white",
                  // 상태별 배경색
                  status === "absent" && "bg-zinc-600 text-white",
                  status === "present" && "bg-yellow-600 text-white",
                  status === "correct" && "bg-green-600 text-white",
                )}
              >
                {key === "Backspace" ? (
                  <Delete className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : key === "Enter" ? (
                  <span>ENTER</span>
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
