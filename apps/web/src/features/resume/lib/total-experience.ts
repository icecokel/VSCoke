export interface ExperienceDuration {
  years: number;
  months: number;
}

// "2023.05 - 2025.07 (2년 3개월)"처럼 시작·종료 월을 모두 포함해 센다. 종료가 날짜가 아니면
// ("재직 중", "Present" 등) 현재 월까지 재직 중인 경력으로 본다.
const periodPattern = /^\s*(\d{4})\.(\d{1,2})\s*[-~–]\s*(?:(\d{4})\.(\d{1,2})|[^\d\s(][^(]*)/;

const toMonthIndex = (year: string, month: string): number | null => {
  const monthNumber = Number(month);
  if (monthNumber < 1 || monthNumber > 12) return null;
  return Number(year) * 12 + monthNumber - 1;
};

/**
 * 경력 기간 문자열에서 겹치는 기간을 한 번만 세어 총 경력을 계산한다.
 * 하나라도 해석할 수 없으면 잘못된 값을 보여 주지 않도록 null을 반환한다.
 */
export const calculateTotalExperience = (
  periods: string[],
  now: Date,
): ExperienceDuration | null => {
  const currentMonth = now.getFullYear() * 12 + now.getMonth();
  const ranges: [number, number][] = [];

  for (const period of periods) {
    const match = periodPattern.exec(period);
    if (!match) return null;
    const start = toMonthIndex(match[1], match[2]);
    const end = match[3] && match[4] ? toMonthIndex(match[3], match[4]) : currentMonth;
    if (start === null || end === null || end < start) return null;
    ranges.push([start, end]);
  }
  if (ranges.length === 0) return null;

  ranges.sort(([firstStart], [secondStart]) => firstStart - secondStart);
  let totalMonths = 0;
  let [mergedStart, mergedEnd] = ranges[0];
  for (const [start, end] of ranges.slice(1)) {
    if (start <= mergedEnd + 1) {
      mergedEnd = Math.max(mergedEnd, end);
      continue;
    }
    totalMonths += mergedEnd - mergedStart + 1;
    [mergedStart, mergedEnd] = [start, end];
  }
  totalMonths += mergedEnd - mergedStart + 1;

  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
};
