export const getMedal = (score: number) => {
  if (score >= 7000) return "🥇";
  if (score >= 6000) return "🥈";
  if (score >= 5000) return "🥉";
  return null;
};
