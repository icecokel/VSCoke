export type LetterStatus = "correct" | "present" | "absent" | "initial";

export interface WordleLogic {
  isValidWord(word: string): boolean;
  checkGuess(guess: string, answer: string): LetterStatus[];
  getWordLength(): number;
}

export class EnglishWordleLogic implements WordleLogic {
  isValidWord(word: string): boolean {
    // 형식만 확인하는 함수다. useWordle의 실제 제출은 /wordle/check로 사전 등록 여부를 검증한다.
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
