interface WordleKeyInput {
  key: string;
  isComposing: boolean;
  keyCode: number;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

// 한글 IME 조합 중에는 keydown이 isComposing=true 또는 keyCode 229로 들어온다.
// 이때의 Enter는 조합 확정일 뿐이므로 게임 입력으로 다루지 않는다.
export const isIgnoredWordleKey = ({
  key,
  isComposing,
  keyCode,
  ctrlKey,
  altKey,
  metaKey,
}: WordleKeyInput): boolean => {
  if (ctrlKey || altKey || metaKey) return true;
  if (isComposing || keyCode === 229) return true;
  return !(key === "Enter" || key === "Backspace" || /^[A-Za-z]$/.test(key));
};
