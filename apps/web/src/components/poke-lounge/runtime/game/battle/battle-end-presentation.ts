import type { BattleResult } from "./battleTypes";

export const BATTLE_END_ANIMATION_DURATION_MS = 1_180;

export type BattleConclusion = "victory" | "defeat" | "capture" | "escape";
export type BattleEndPresentationStage = "impact" | "resolve" | "banner";

export interface BattleEndPresentationFrame {
  accentColor: number;
  bannerAlpha: number;
  bannerOffsetY: number;
  bannerText: string;
  burstRadius: number;
  flashAlpha: number;
  loserAlpha: number;
  loserOffsetY: number;
  loserScale: number;
  particleAlpha: number;
  stage: BattleEndPresentationStage;
  winnerScale: number;
}

export function resolveBattleConclusion(
  result: Pick<BattleResult, "reason" | "winnerPlayerId">,
  playerId: string,
): BattleConclusion {
  if (result.reason === "capture") {
    return "capture";
  }

  if (result.reason === "run") {
    return "escape";
  }

  return result.winnerPlayerId === playerId ? "victory" : "defeat";
}

export function resolveBattleEndPresentationFrame(
  progress: number,
  conclusion: BattleConclusion,
): BattleEndPresentationFrame {
  const normalizedProgress = clampProgress(progress);
  const style = getBattleConclusionStyle(conclusion);
  const impactProgress = clampProgress(normalizedProgress / 0.18);
  const resolveProgress = clampProgress((normalizedProgress - 0.13) / 0.58);
  const bannerProgress = clampProgress((normalizedProgress - 0.58) / 0.32);
  const isFadingLoser = conclusion === "victory" || conclusion === "defeat";
  const easedResolveProgress = easeOutCubic(resolveProgress);
  const pulse = Math.sin(Math.min(1, normalizedProgress / 0.74) * Math.PI);

  return {
    accentColor: style.accentColor,
    bannerAlpha: Math.min(1, bannerProgress * 1.8),
    bannerOffsetY: Math.round((1 - easeOutCubic(bannerProgress)) * -8),
    bannerText: style.bannerText,
    burstRadius: 8 + impactProgress * 32,
    flashAlpha: (1 - impactProgress) * 0.32,
    loserAlpha: isFadingLoser ? 1 - easedResolveProgress * 0.8 : 1,
    loserOffsetY: isFadingLoser ? Math.round(easedResolveProgress * 13) : 0,
    loserScale: isFadingLoser ? 1 - easedResolveProgress * 0.12 : 1,
    particleAlpha: Math.max(0, 1 - normalizedProgress) * 0.9,
    stage: normalizedProgress < 0.18 ? "impact" : normalizedProgress < 0.72 ? "resolve" : "banner",
    winnerScale: 1 + pulse * 0.045,
  };
}

function getBattleConclusionStyle(conclusion: BattleConclusion): {
  accentColor: number;
  bannerText: string;
} {
  if (conclusion === "defeat") {
    return { accentColor: 0xe88498, bannerText: "REGROUP" };
  }

  if (conclusion === "capture") {
    return { accentColor: 0x7ee0c2, bannerText: "SIGNAL SEALED" };
  }

  if (conclusion === "escape") {
    return { accentColor: 0x8eb9f5, bannerText: "SAFE EXIT" };
  }

  return { accentColor: 0xf4c95d, bannerText: "BATTLE CLEAR" };
}

function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}
