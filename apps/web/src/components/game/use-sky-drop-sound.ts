"use client";

import { useCallback, useEffect, useRef } from "react";
import type { SkyDropState } from "./sky-drop-engine";

const soundFiles = {
  pickup: "/sounds/sky-drop/pick-up.wav",
  putdown: "/sounds/sky-drop/put-down.wav",
  score: "/sounds/sky-drop/add-score.mp3",
  gameover: "/sounds/sky-drop/game-over.wav",
};
type SoundKind = keyof typeof soundFiles;

export const useSkyDropSound = (feedback: SkyDropState["feedback"], isMuted: boolean) => {
  const audioRef = useRef<Partial<Record<SoundKind, HTMLAudioElement>>>({});
  const lastFeedback = useRef<SkyDropState["feedback"]>(null);
  const isUnlocked = useRef(false);

  useEffect(() => {
    const clips: Partial<Record<SoundKind, HTMLAudioElement>> = {};
    for (const kind of Object.keys(soundFiles) as SoundKind[]) {
      const audio = new Audio(soundFiles[kind]);
      audio.preload = "auto";
      audio.volume = 0.2;
      clips[kind] = audio;
    }
    audioRef.current = clips;
    return () => {
      for (const audio of Object.values(clips)) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      audioRef.current = {};
      isUnlocked.current = false;
    };
  }, []);

  const unlockSound = useCallback(() => {
    if (isUnlocked.current || isMuted) return;
    isUnlocked.current = true;
    // iOS에서도 사용자 시작/탭 제스처 안에서 오디오 재생 권한을 확보한다.
    for (const audio of Object.values(audioRef.current)) {
      audio.muted = true;
      void audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    }
  }, [isMuted]);

  useEffect(() => {
    if (!feedback || feedback === lastFeedback.current) return;
    lastFeedback.current = feedback;
    if (isMuted) return;
    const audio = audioRef.current[feedback.kind];
    if (!audio) return;
    audio.currentTime = 0;
    // 효과음 실패는 게임 상태 전이나 점수 저장을 막지 않는다.
    void audio.play().catch(() => undefined);
  }, [feedback, isMuted]);

  useEffect(() => {
    if (isMuted) Object.values(audioRef.current).forEach(audio => audio.pause());
  }, [isMuted]);

  return unlockSound;
};
