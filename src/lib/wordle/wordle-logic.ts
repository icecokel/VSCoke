export type LetterStatus = "correct" | "present" | "absent" | "initial";

export interface WordleLogic {
  isValidWord(word: string): boolean;
  checkGuess(guess: string, answer: string): LetterStatus[];
  getRandomWord(): string;
  getWordLength(): number;
}

const MOCK_WORDS = [
  "APPLE",
  "BEACH",
  "BRAIN",
  "BREAD",
  "BRUSH",
  "CHAIR",
  "CHEST",
  "CHORD",
  "CLICK",
  "CLOCK",
  "CLOUD",
  "DANCE",
  "DIARY",
  "DRINK",
  "DRIVE",
  "EARTH",
  "FEAST",
  "FIELD",
  "FRUIT",
  "GLASS",
  "GRAPE",
  "GREEN",
  "GHOST",
  "HEART",
  "HOUSE",
  "JUICE",
  "LIGHT",
  "LEMON",
  "MELON",
  "MONEY",
  "MUSIC",
  "NIGHT",
  "OCEAN",
  "PARTY",
  "PHONE",
  "PIANO",
  "PILOT",
  "PLANE",
  "PLANT",
  "PLATE",
  "RADIO",
  "RIVER",
  "ROBOT",
  "SHIRT",
  "SHOES",
  "SMILE",
  "SNAKE",
  "SPACE",
  "SPOON",
  "STORM",
  "TABLE",
  "TIGER",
  "TOAST",
  "TOUCH",
  "TRAIN",
  "TRUCK",
  "VOICE",
  "WATER",
  "WATCH",
  "WHALE",
  "WORLD",
  "WRITE",
  "YOUTH",
  "ZEBRA",
  "LUCKY",
];

export class EnglishWordleLogic implements WordleLogic {
  isValidWord(word: string): boolean {
    // 실제 구현에서는 전체 사전 데이터가 필요하겠지만,
    // Mock 단계에서는 5글자 영어인지와 Mock 리스트에 있는지만 체크하거나
    // 간단히 길이만 체크할 수도 있음. 여기서는 리스트 포함 여부로 체크.
    return MOCK_WORDS.includes(word.toUpperCase());
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

  getRandomWord(): string {
    return MOCK_WORDS[Math.floor(Math.random() * MOCK_WORDS.length)];
  }

  getWordLength(): number {
    return 5;
  }
}
