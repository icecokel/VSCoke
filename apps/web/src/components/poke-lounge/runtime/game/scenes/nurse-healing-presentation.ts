export const NURSE_HEALING_ANIMATION_DURATION_MS = 1_260;

export type NurseHealingPresentationStage = "charge" | "transfer" | "restore" | "settle";

export interface NurseHealingPresentationFrame {
  completionAlpha: number;
  linkAlpha: number;
  nurseGlowAlpha: number;
  nurseGlowRadius: number;
  playerAuraAlpha: number;
  playerAuraRadius: number;
  shardDistance: number;
  shardProgress: number;
  stage: NurseHealingPresentationStage;
  transferProgress: number;
}

export function resolveNurseHealingPresentationFrame(
  progress: number,
): NurseHealingPresentationFrame {
  const normalizedProgress = clampProgress(progress);

  if (normalizedProgress < 0.22) {
    const stageProgress = normalizedProgress / 0.22;

    return {
      completionAlpha: 0,
      linkAlpha: 0,
      nurseGlowAlpha: 0.22 + stageProgress * 0.72,
      nurseGlowRadius: 11 + stageProgress * 17,
      playerAuraAlpha: 0,
      playerAuraRadius: 0,
      shardDistance: 0,
      shardProgress: 0,
      stage: "charge",
      transferProgress: 0,
    };
  }

  if (normalizedProgress < 0.64) {
    const stageProgress = (normalizedProgress - 0.22) / 0.42;

    return {
      completionAlpha: 0,
      linkAlpha: 0.38 + Math.sin(stageProgress * Math.PI) * 0.54,
      nurseGlowAlpha: 0.92 - stageProgress * 0.44,
      nurseGlowRadius: 28 - stageProgress * 10,
      playerAuraAlpha: stageProgress * 0.34,
      playerAuraRadius: 12 + stageProgress * 12,
      shardDistance: 0,
      shardProgress: 0,
      stage: "transfer",
      transferProgress: stageProgress,
    };
  }

  if (normalizedProgress < 0.9) {
    const stageProgress = (normalizedProgress - 0.64) / 0.26;

    return {
      completionAlpha: stageProgress * 0.78,
      linkAlpha: (1 - stageProgress) * 0.28,
      nurseGlowAlpha: 0.3 * (1 - stageProgress),
      nurseGlowRadius: 18 + stageProgress * 7,
      playerAuraAlpha: 0.82 - stageProgress * 0.3,
      playerAuraRadius: 24 + stageProgress * 22,
      shardDistance: 8 + stageProgress * 26,
      shardProgress: stageProgress,
      stage: "restore",
      transferProgress: 1,
    };
  }

  const stageProgress = (normalizedProgress - 0.9) / 0.1;

  return {
    completionAlpha: 0.78 * (1 - stageProgress),
    linkAlpha: 0,
    nurseGlowAlpha: 0,
    nurseGlowRadius: 0,
    playerAuraAlpha: 0.48 * (1 - stageProgress),
    playerAuraRadius: 46 + stageProgress * 7,
    shardDistance: 34 + stageProgress * 8,
    shardProgress: 1,
    stage: "settle",
    transferProgress: 1,
  };
}

function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}
