import { cn } from "@/lib/utils";
import { LetterStatus } from "@/lib/wordle/wordle-logic";

interface WordleTileProps {
  letter?: string;
  status?: LetterStatus;
  index?: number;
}

export function WordleTile({ letter, status, index = 0 }: WordleTileProps) {
  const animationDelay = `${index * 300}ms`;

  return (
    <div
      style={{ animationDelay }}
      className={cn(
        // 정사각형 유지, 최소 40px (터치 친화적)
        "flex items-center justify-center w-full aspect-square min-w-10 min-h-10",
        "font-bold uppercase select-none transition-all duration-300",
        // 반응형 폰트 크기
        "text-base sm:text-xl md:text-2xl",
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
