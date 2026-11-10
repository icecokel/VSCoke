import type { LetterStatus } from "@/lib/wordle/wordle-logic";

export type WordleTileLabelKey =
  | "wordleTileEmpty"
  | "wordleTileTyping"
  | "wordleTileCorrect"
  | "wordleTilePresent"
  | "wordleTileAbsent";

type Translate = (key: WordleTileLabelKey, values?: { letter: string }) => string;

const statusKeys: Record<LetterStatus, WordleTileLabelKey> = {
  initial: "wordleTileTyping",
  correct: "wordleTileCorrect",
  present: "wordleTilePresent",
  absent: "wordleTileAbsent",
};

// 타일 색만으로는 판정 결과를 알 수 없는 스크린리더 사용자를 위해 글자와 상태를 문장으로 만든다.
export const resolveWordleTileLabel = (
  letter: string | undefined,
  status: LetterStatus | undefined,
  t: Translate,
): string => {
  if (!letter) return t("wordleTileEmpty");
  const upper = letter.toUpperCase();
  if (!status) return t("wordleTileTyping", { letter: upper });
  return t(statusKeys[status], { letter: upper });
};
