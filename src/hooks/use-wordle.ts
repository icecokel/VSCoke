import { useState, useEffect, useCallback } from "react";
import { WordleLogic, LetterStatus, EnglishWordleLogic } from "@/lib/wordle/wordle-logic";
import { fetchRandomWord, checkWord } from "@/lib/wordle/wordle-service";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

const MAX_CHALLENGES = 6;

export type GameStatus = "playing" | "won" | "lost";

export interface UseWordleReturn {
  currentGuess: string;
  guesses: string[];
  history: LetterStatus[][];
  isCorrect: boolean;
  turn: number;
  gameStatus: GameStatus;
  usedKeys: Record<string, LetterStatus>;
  handleKeyup: (key: string) => void;
  resetGame: () => Promise<void>;
  answer: string; // 디버깅용
  isLoading: boolean;
  isValidating: boolean; // 단어 검증 중 상태
  error: Error | null;
}

// Logic 인스턴스는 컴포넌트 외부 혹은 useMemo로 관리 권장
const logic: WordleLogic = new EnglishWordleLogic();

export const useWordle = (): UseWordleReturn => {
  const t = useTranslations("Game");
  const [answer, setAnswer] = useState<string>("");
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [guesses, setGuesses] = useState<string[]>([...Array(MAX_CHALLENGES)]);
  const [history, setHistory] = useState<LetterStatus[][]>([...Array(MAX_CHALLENGES)]);
  const [turn, setTurn] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
  const [usedKeys, setUsedKeys] = useState<Record<string, LetterStatus>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // 단어 가져오기
  const loadNewWord = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const word = await fetchRandomWord();
      setAnswer(word.toUpperCase());
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load word"));
      toast.error(t("loadFailed")); // 번역 키 확인 필요, 없으면 fallback
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // 게임 초기화
  const resetGame = useCallback(async () => {
    setTurn(0);
    setCurrentGuess("");
    setGuesses([...Array(MAX_CHALLENGES)]);
    setHistory([...Array(MAX_CHALLENGES)]);
    setGameStatus("playing");
    setUsedKeys({});
    await loadNewWord();
  }, [loadNewWord]);

  // 최초 진입 시 단어 설정
  useEffect(() => {
    // 마운트 시 한 번만 실행
    loadNewWord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 제출 처리
  const submitGuess = useCallback(async () => {
    if (gameStatus !== "playing" || isValidating) return;

    // 단어 유효성 검사 (길이)
    if (currentGuess.length !== logic.getWordLength()) {
      toast.error(t("notEnoughLetters"));
      return;
    }

    // 서버 API를 통한 단어 유효성 검사
    try {
      setIsValidating(true);
      const isValid = await checkWord(currentGuess);

      if (!isValid) {
        toast.error(t("notInList"));
        setCurrentGuess(""); // 없는 단어 자동 삭제
        return;
      }
    } catch (err) {
      console.error(err);
      toast.error(t("errorOccurred")); // 에러 발생 시 메시지
      return;
    } finally {
      setIsValidating(false);
    }

    // 로컬 로직 검증 (사전 검증이 이미 API로 대체되었지만, logic 인터페이스 유지를 위해 남겨둠/혹은 제거 가능)
    // if (!logic.isValidWord(currentGuess)) { ... }

    const result = logic.checkGuess(currentGuess, answer);

    // 정답 여부 확인
    if (currentGuess.toUpperCase() === answer) {
      setGameStatus("won");
    } else if (turn === MAX_CHALLENGES - 1) {
      setGameStatus("lost");
    }

    // 상태 업데이트
    setGuesses(prev => {
      const newGuesses = [...prev];
      newGuesses[turn] = currentGuess.toUpperCase();
      return newGuesses;
    });

    setHistory(prev => {
      const newHistory = [...prev];
      newHistory[turn] = result;
      return newHistory;
    });

    setTurn(prev => prev + 1);

    // 키보드 색상 업데이트
    setUsedKeys(prev => {
      const newKeys = { ...prev };
      const guessUpper = currentGuess.toUpperCase();

      result.forEach((status, i) => {
        const letter = guessUpper[i];
        const currentStatus = newKeys[letter];

        if (status === "correct") {
          newKeys[letter] = "correct";
        } else if (status === "present" && currentStatus !== "correct") {
          newKeys[letter] = "present";
        } else if (
          status === "absent" &&
          currentStatus !== "correct" &&
          currentStatus !== "present"
        ) {
          newKeys[letter] = "absent";
        }
      });
      return newKeys;
    });

    setCurrentGuess("");
  }, [currentGuess, turn, answer, gameStatus, t, isValidating]);

  // 키 입력 핸들러 (외부에서 호출 가능)
  const handleKeyup = useCallback(
    (key: string) => {
      if (gameStatus !== "playing" || isValidating) return;

      if (key === "Enter") {
        submitGuess();
        return;
      }

      if (key === "Backspace") {
        setCurrentGuess(prev => prev.slice(0, -1));
        return;
      }

      // 영문자 입력만 허용
      if (/^[A-Za-z]$/.test(key)) {
        if (currentGuess.length < logic.getWordLength()) {
          setCurrentGuess(prev => prev + key);
        }
      }
    },
    [currentGuess, gameStatus, submitGuess, isValidating],
  );

  return {
    currentGuess,
    guesses,
    history,
    isCorrect: gameStatus === "won",
    turn,
    gameStatus,
    usedKeys,
    handleKeyup,
    resetGame,
    answer,
    isLoading,
    isValidating,
    error,
  };
};
