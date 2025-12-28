/**
 * Sky Drop 게임의 점수에 따른 메달/아이콘 반환
 * 4000 - 🥉 동메달
 * 5000 - 🥈 은메달
 * 6000 - 🥇 금메달
 * 7000 - 💎 다이아몬드
 * 7500 - 🏆 트로피
 * 8000 - 👑 왕관
 * 8500 - ⭐ 스타
 */
export const getMedal = (score: number) => {
  if (score >= 8500) return "⭐";
  if (score >= 8000) return "👑";
  if (score >= 7500) return "🏆";
  if (score >= 7000) return "💎";
  if (score >= 6000) return "🥇";
  if (score >= 5000) return "🥈";
  if (score >= 4000) return "🥉";
  return null;
};
