export type LetterStatus = "correct" | "present" | "absent" | "initial";

export interface WordleLogic {
  isValidWord(word: string): boolean;
  checkGuess(guess: string, answer: string): LetterStatus[];
  getWordLength(): number;
}

export class EnglishWordleLogic implements WordleLogic {
  isValidWord(word: string): boolean {
    // API 연동 후 검증 로직 정책:
    // 1. API가 있다면 API 검증을 쓰겠지만 현재는 정답만 가져옴.
    // 2. 로컬 사전 데이터보다는 길이 체크 정도로 완화하거나,
    //    기존 MOCK_WORDS를 확장해서 검증용으로만 유지.
    //    일단은 길이 체크만 수행하고 모든 5글자 영단어를 허용하는 방향으로 수정 (사용자 경험상 사전이 없으면 너무 빡빡함)
    //    또는 기존 MOCK_WORDS를 'common words'로 간주하여 체크.
    //    여기서는 간단히 길이 체크 + 영문 여부만 확인하도록 변경.
    //    (엄격한 검증이 필요하면 별도 사전 데이터나 API 필요)
    return /^[A-Za-z]{5}$/.test(word);
  }

  checkGuess(guess: string, answer: string): LetterStatus[] {
    const result: LetterStatus[] = Array(5).fill("absent");
    const guessArr = guess.toUpperCase().split("");
    const answerArr = answer.toUpperCase().split("");
    const answerLetterCounts: Record<string, number> = {};

    // 1. Count letter frequencies in the answer
    answerArr.forEach(char => {
      answerLetterCounts[char] = (answerLetterCounts[char] || 0) + 1;
    });

    // 2. First pass: Find 'correct' (green) matches
    guessArr.forEach((char, i) => {
      if (char === answerArr[i]) {
        result[i] = "correct";
        answerLetterCounts[char]--;
      }
    });

    // 3. Second pass: Find 'present' (yellow) matches
    guessArr.forEach((char, i) => {
      if (result[i] !== "correct" && answerLetterCounts[char] > 0) {
        result[i] = "present";
        answerLetterCounts[char]--;
      }
    });

    return result;
  }

  getWordLength(): number {
    return 5;
  }
}
