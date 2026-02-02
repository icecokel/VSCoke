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
    // h-full로 부모 높이에 맞춤, 3행 키보드
    <div className="w-full h-full flex flex-col gap-0.5">
      {rows.map((row, i) => (
        // 각 행: h-1/3으로 균등 분할
        <div key={i} className="h-1/3 flex justify-center gap-0.5 touch-manipulation">
          {row.map(key => {
            const status = usedKeys[key];
            const isSpecial = key.length > 1;

            return (
              <button
                key={key}
                onClick={() => onKey(key)}
                className={cn(
                  "h-full flex items-center justify-center rounded font-bold uppercase transition-all active:scale-95 select-none text-[10px] sm:text-xs",
                  // 버튼 크기: 일반키는 flex-1, 특수키는 1.5배
                  isSpecial ? "flex-[1.5] px-0.5" : "flex-1",
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
                  <Delete className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : key === "Enter" ? (
                  <span className="text-[8px] sm:text-[10px]">ENTER</span>
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
