export interface RomBattleSoundCue {
  readonly sdatPath: string;
  readonly sequenceName: string;
  readonly sequenceIndex: number;
  readonly fileId: number;
  readonly rawFilePath: string;
}

export interface BattleToneCue {
  readonly startMs: number;
  readonly durationMs: number;
  readonly frequencyHz: number;
  readonly gain: number;
  readonly type: OscillatorType;
}

export const BATTLE_SOUND_CUES = {
  wildBattleBgm: {
    sdatPath: "data/sound/gs_sound_data.sdat",
    sequenceName: "SEQ_GS_VS_NORAPOKE",
    sequenceIndex: 1116,
    fileId: 89,
    rawFilePath: "data/processed/rom-sound/00_data__sound__gs_sound_data.sdat/file_0089.bin",
  },
  confirm: {
    sdatPath: "data/sound/gs_sound_data.sdat",
    sequenceName: "SEQ_SE_PL_BUTTON",
    sequenceIndex: 1394,
    fileId: 319,
    rawFilePath: "data/processed/rom-sound/00_data__sound__gs_sound_data.sdat/file_0319.bin",
  },
  transition: {
    sdatPath: "data/sound/gs_sound_data.sdat",
    sequenceName: "SEQ_SE_PL_WARP",
    sequenceIndex: 1390,
    fileId: 316,
    rawFilePath: "data/processed/rom-sound/00_data__sound__gs_sound_data.sdat/file_0316.bin",
  },
} as const satisfies Record<string, RomBattleSoundCue>;

export function createBattleStartTonePlan(): BattleToneCue[] {
  return [
    { startMs: 0, durationMs: 90, frequencyHz: 392, gain: 0.08, type: "square" },
    { startMs: 75, durationMs: 110, frequencyHz: 523.25, gain: 0.07, type: "square" },
    { startMs: 160, durationMs: 150, frequencyHz: 783.99, gain: 0.055, type: "triangle" },
  ];
}

export function playBattleStartSound(audioContextFactory = createBrowserAudioContext): void {
  const context = audioContextFactory();

  if (!context) {
    return;
  }

  const now = context.currentTime;

  for (const cue of createBattleStartTonePlan()) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = now + cue.startMs / 1000;
    const stopAt = startAt + cue.durationMs / 1000;

    oscillator.type = cue.type;
    oscillator.frequency.setValueAtTime(cue.frequencyHz, startAt);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(cue.gain, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, stopAt);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.01);
  }
}

function createBrowserAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextConstructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  const context = new AudioContextConstructor();

  void context.resume?.();

  return context;
}
