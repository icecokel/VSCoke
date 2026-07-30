"use client";

import { GaugeIcon, PauseIcon, PlayIcon, SquareIcon, Volume2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BLOG_SPEECH_CONTENT_ID,
  BLOG_SPEECH_EXCLUDE_SELECTOR,
  BLOG_SPEECH_SEGMENT_SELECTOR,
  createBlogSpeechSegments,
  normalizeBlogSpeechText,
} from "@/components/blog/blog-speech";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SpeechPlaybackState = "error" | "idle" | "paused" | "speaking";
type SpeechSupportState = "checking" | "supported" | "unsupported";

interface BlogSpeechControlsProps {
  description: string;
  language: string;
  title: string;
}

const speechRates = [0.8, 1, 1.2] as const;
const ignoredSpeechErrors = new Set(["canceled", "interrupted"]);

const selectPreferredVoice = (
  voices: SpeechSynthesisVoice[],
  language: string,
): SpeechSynthesisVoice | null => {
  const normalizedLanguage = language.toLowerCase();
  const languagePrefix = normalizedLanguage.split("-")[0];
  const matchingVoices = voices.filter(voice => {
    const voiceLanguage = voice.lang.toLowerCase();
    return voiceLanguage === normalizedLanguage || voiceLanguage.split("-")[0] === languagePrefix;
  });

  return (
    matchingVoices.find(
      voice => voice.localService && voice.lang.toLowerCase() === normalizedLanguage,
    ) ??
    matchingVoices.find(voice => voice.lang.toLowerCase() === normalizedLanguage) ??
    matchingVoices.find(voice => voice.localService) ??
    matchingVoices[0] ??
    null
  );
};

const getSpeechSegments = (title: string, description: string): string[] => {
  const article = document.getElementById(BLOG_SPEECH_CONTENT_ID);
  if (!article) {
    return [];
  }

  const contentSegments = Array.from(
    article.querySelectorAll<HTMLElement>(BLOG_SPEECH_SEGMENT_SELECTOR),
  )
    .filter(
      element =>
        !element.closest(BLOG_SPEECH_EXCLUDE_SELECTOR) &&
        !element.querySelector(BLOG_SPEECH_SEGMENT_SELECTOR),
    )
    .map(element => normalizeBlogSpeechText(element.textContent ?? ""))
    .filter(Boolean);

  return createBlogSpeechSegments({ title, description, contentSegments });
};

export const BlogSpeechControls = ({ description, language, title }: BlogSpeechControlsProps) => {
  const t = useTranslations("blog.speech");
  const [playbackState, setPlaybackState] = useState<SpeechPlaybackState>("idle");
  const [rate, setRate] = useState<(typeof speechRates)[number]>(1);
  const [supportState, setSupportState] = useState<SpeechSupportState>("checking");
  const currentSegmentIndexRef = useRef(0);
  const playbackStateRef = useRef<SpeechPlaybackState>("idle");
  const rateRef = useRef<(typeof speechRates)[number]>(1);
  const runIdRef = useRef(0);
  const segmentsRef = useRef<string[]>([]);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  const updatePlaybackState = useCallback((nextState: SpeechPlaybackState) => {
    playbackStateRef.current = nextState;
    setPlaybackState(nextState);
  }, []);

  const stopSpeech = useCallback(() => {
    runIdRef.current += 1;
    currentSegmentIndexRef.current = 0;
    segmentsRef.current = [];
    window.speechSynthesis.cancel();
    updatePlaybackState("idle");
  }, [updatePlaybackState]);

  const speakSegments = useCallback(
    (startIndex: number, runId: number) => {
      const synth = window.speechSynthesis;
      const speakNext = (segmentIndex: number) => {
        if (runIdRef.current !== runId || playbackStateRef.current !== "speaking") {
          return;
        }

        const segment = segmentsRef.current[segmentIndex];
        if (!segment) {
          currentSegmentIndexRef.current = 0;
          segmentsRef.current = [];
          updatePlaybackState("idle");
          return;
        }

        currentSegmentIndexRef.current = segmentIndex;
        const utterance = new SpeechSynthesisUtterance(segment);
        const preferredVoice = selectPreferredVoice(voicesRef.current, language);

        utterance.lang = language;
        utterance.rate = rateRef.current;
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.addEventListener("end", () => {
          speakNext(segmentIndex + 1);
        });
        utterance.addEventListener("error", event => {
          if (runIdRef.current !== runId || ignoredSpeechErrors.has(event.error)) {
            return;
          }

          updatePlaybackState("error");
        });

        try {
          synth.speak(utterance);
        } catch {
          if (runIdRef.current === runId) {
            updatePlaybackState("error");
          }
        }
      };

      speakNext(startIndex);
    },
    [language, updatePlaybackState],
  );

  useEffect(() => {
    const hasSpeechSynthesis =
      typeof window.speechSynthesis !== "undefined" &&
      typeof window.SpeechSynthesisUtterance !== "undefined";

    if (!hasSpeechSynthesis) {
      setSupportState("unsupported");
      return;
    }

    const synth = window.speechSynthesis;
    const updateVoices = () => {
      voicesRef.current = synth.getVoices();
    };

    setSupportState("supported");
    updateVoices();
    synth.addEventListener("voiceschanged", updateVoices);

    return () => {
      runIdRef.current += 1;
      if (playbackStateRef.current !== "idle") {
        synth.cancel();
      }
      synth.removeEventListener("voiceschanged", updateVoices);
    };
  }, []);

  const handlePrimaryAction = () => {
    if (supportState !== "supported") {
      return;
    }

    if (playbackState === "speaking") {
      runIdRef.current += 1;
      window.speechSynthesis.cancel();
      updatePlaybackState("paused");
      return;
    }

    if (playbackState === "paused") {
      const nextRunId = runIdRef.current + 1;
      runIdRef.current = nextRunId;
      updatePlaybackState("speaking");
      speakSegments(currentSegmentIndexRef.current, nextRunId);
      return;
    }

    const segments = getSpeechSegments(title, description);
    if (segments.length === 0) {
      updatePlaybackState("error");
      return;
    }

    const nextRunId = runIdRef.current + 1;
    runIdRef.current = nextRunId;
    segmentsRef.current = segments;
    currentSegmentIndexRef.current = 0;
    window.speechSynthesis.cancel();
    updatePlaybackState("speaking");
    speakSegments(0, nextRunId);
  };

  const handleRateChange = () => {
    const currentRateIndex = speechRates.indexOf(rate);
    const nextRate = speechRates[(currentRateIndex + 1) % speechRates.length];

    rateRef.current = nextRate;
    setRate(nextRate);

    if (playbackState !== "speaking") {
      return;
    }

    const nextRunId = runIdRef.current + 1;
    runIdRef.current = nextRunId;
    window.speechSynthesis.cancel();
    speakSegments(currentSegmentIndexRef.current, nextRunId);
  };

  const primaryLabel =
    supportState === "unsupported"
      ? t("unsupported")
      : playbackState === "speaking"
        ? t("pause")
        : playbackState === "paused"
          ? t("resume")
          : t("read");
  const PrimaryIcon =
    playbackState === "speaking" ? PauseIcon : playbackState === "paused" ? PlayIcon : Volume2Icon;
  const formattedRate = Number.isInteger(rate) ? rate.toFixed(0) : rate.toFixed(1);
  const liveMessage =
    playbackState === "speaking"
      ? t("speakingStatus")
      : playbackState === "paused"
        ? t("pausedStatus")
        : playbackState === "error"
          ? t("error")
          : "";

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-2"
      data-testid="blog-speech-controls"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-controls={BLOG_SPEECH_CONTENT_ID}
            aria-pressed={playbackState === "speaking"}
            data-testid="blog-speech-primary"
            disabled={supportState !== "supported"}
            onClick={handlePrimaryAction}
          >
            <PrimaryIcon aria-hidden="true" className="size-4" />
            {primaryLabel}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          className="border border-gray-700 bg-gray-900 text-white"
          data-testid="blog-speech-experimental-tooltip"
        >
          {t("experimentalHint")}
        </TooltipContent>
      </Tooltip>

      {supportState === "supported" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t("speed", { rate: formattedRate })}
          data-testid="blog-speech-rate"
          onClick={handleRateChange}
          title={t("speed", { rate: formattedRate })}
        >
          <GaugeIcon aria-hidden="true" className="size-4" />
          {formattedRate}×
        </Button>
      )}

      {(playbackState === "speaking" || playbackState === "paused") && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-controls={BLOG_SPEECH_CONTENT_ID}
          data-testid="blog-speech-stop"
          onClick={stopSpeech}
          title={t("stop")}
        >
          <SquareIcon aria-hidden="true" className="size-4" />
          {t("stop")}
        </Button>
      )}

      <span className="sr-only" aria-live="polite">
        {liveMessage}
      </span>
      {playbackState === "error" && (
        <span className="basis-full text-right text-sm text-red-300" role="alert">
          {t("error")}
        </span>
      )}
    </div>
  );
};
