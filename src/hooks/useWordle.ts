import { useState, useEffect, useCallback } from "react";
import { WordleLogic, LetterStatus, EnglishWordleLogic } from "@/lib/wordle/wordle-logic";

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
  resetGame: () => void;
  answer: string; // 디버깅용, 실제 프로덕션에서는 숨겨야 함
}

// Logic 인스턴스는 컴포넌트 외부 혹은 useMemo로 관리 권장
const logic: WordleLogic = new EnglishWordleLogic();

export const useWordle = (): UseWordleReturn => {
  const [answer, setAnswer] = useState<string>("");
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [guesses, setGuesses] = useState<string[]>([...Array(MAX_CHALLENGES)]); // [...undefined]
  const [history, setHistory] = useState<LetterStatus[][]>([...Array(MAX_CHALLENGES)]);
  const [turn, setTurn] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
  const [usedKeys, setUsedKeys] = useState<Record<string, LetterStatus>>({});

  // 게임 초기화
  const resetGame = useCallback(() => {
    setTurn(0);
    setCurrentGuess("");
    setGuesses([...Array(MAX_CHALLENGES)]);
    setHistory([...Array(MAX_CHALLENGES)]);
    setGameStatus("playing");
    setUsedKeys({});
    setAnswer(logic.getRandomWord());
  }, []);

  // 최초 진입 시 단어 설정
  useEffect(() => {
    // answer가 비어있을 때만 초기화 (Strict Mode 등 중복 실행 방지)
    if (!answer) {
      setAnswer(logic.getRandomWord());
    }
  }, [answer]);

  // 제출 처리
  const submitGuess = useCallback(() => {
    if (gameStatus !== "playing") return;

    // 단어 유효성 검사 (길이)
    if (currentGuess.length !== logic.getWordLength()) {
      // TODO: Toast warning "Not enough letters"
      console.log("Not enough letters");
      return;
    }

    // 단어 유효성 검사 (사전)
    if (!logic.isValidWord(currentGuess)) {
      // TODO: Toast warning "Not in word list"
      console.log("Not in word list");
      return;
    }

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
  }, [currentGuess, turn, answer, gameStatus]);

  // 키 입력 핸들러 (외부에서 호출 가능)
  const handleKeyup = useCallback(
    (key: string) => {
      if (gameStatus !== "playing") return;

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
    [currentGuess, gameStatus, submitGuess],
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
  };
};
