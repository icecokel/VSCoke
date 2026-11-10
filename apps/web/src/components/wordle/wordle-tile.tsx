import { cn } from "@/lib/utils";
import { LetterStatus } from "@/lib/wordle/wordle-logic";
import styles from "./wordle.module.css";

interface WordleTileProps {
  letter?: string;
  status?: LetterStatus;
  index?: number;
  // 스크린리더용 설명. 글자와 판정 상태를 담는다.
  label?: string;
}

export function WordleTile({ letter, status, index = 0, label }: WordleTileProps) {
  const animationDelay = `${index * 300}ms`;

  return (
    <div
      role="img"
      aria-label={label}
      style={{ animationDelay }}
      className={cn(
        "flex h-full w-full min-h-0 min-w-0 items-center justify-center",
        styles.tile,
        "font-bold uppercase select-none transition-all duration-300",

        // 빈 타일: 얇은 테두리만
        !status && !letter && "border border-gray-600/40",
        // 입력 중인 타일: 테두리 없이 배경만
        !status && letter && "bg-gray-700/50 text-white",
        // 결과 타일: 배경색 (애니메이션 적용)
        status && "animate-flip",
        status === "absent" && "bg-zinc-600 text-white",
        status === "present" && "bg-yellow-600 text-white",
        status === "correct" && "bg-green-600 text-white",
      )}
    >
      {letter}
    </div>
  );
}
