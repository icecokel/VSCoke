"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { useGameShare } from "@/hooks/use-game-share";
import { useSession, signIn } from "next-auth/react";
import { Share2, RotateCcw, ArrowLeft, Save, Loader2, LogIn } from "lucide-react";
import { getSkyDropMedal } from "@/utils/sky-drop-util";
import { clearSkyDropPendingScore, parsePendingSkyDropScore } from "./sky-drop-storage";
import { submitScore } from "@/services/score-service";
import { toast } from "sonner";
import { getSessionApiIdToken, isAuthSessionError, type ApiTokenSession } from "@/lib/auth-token";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// 게임별 메달 계산
const getMedalForGame = (gameName: string, score: number): string | null => {
  switch (gameName) {
    case "sky-drop":
      return getSkyDropMedal(score);
    default:
      return null;
  }
};

interface ResultScreenProps {
  score: number;
  gameName: string;
  playTime?: number;
  onRestart: () => void;
}

interface PendingScore {
  gameName: string;
  score: number;
  timestamp: number;
  playTime?: number;
  requiresManualLogin?: boolean;
}

export const ResultScreen = ({ score, gameName, playTime, onRestart }: ResultScreenProps) => {
  const t = useTranslations("Game");
  const router = useCustomRouter();
  const { data: session, status } = useSession();
  const { share } = useGameShare();
  const [isSharing, setIsSharing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resultId, setResultId] = useState<string | undefined>(undefined);
  const [rank, setRank] = useState<number | null>(null);
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [isPendingChecked, setIsPendingChecked] = useState(false);
  const hasAutoSubmitted = useRef(false);
  const isSubmittingRef = useRef(false);
  const readPendingScore = useCallback((): PendingScore | null => {
    try {
      const pendingStr = localStorage.getItem("pendingScore");
      if (!pendingStr) return null;
      const pending = parsePendingSkyDropScore(pendingStr, Date.now());
      if (!pending || pending.gameName !== gameName || pending.score !== score) return null;
      return pending;
    } catch {
      return null;
    }
  }, [gameName, score]);
  const savePendingScore = useCallback(
    (requiresManualLogin: boolean = false) => {
      try {
        localStorage.setItem(
          "pendingScore",
          JSON.stringify({
            gameName,
            score,
            playTime,
            timestamp: Date.now(),
            requiresManualLogin,
          } satisfies PendingScore),
        );
      } catch {
        // 저장소 제한 환경에서도 현재 화면의 제출은 계속 허용한다.
      }
    },
    [gameName, score, playTime],
  );
  const apiTokenSession = session as ApiTokenSession | null;
  const sessionError = apiTokenSession?.error;
  const submitToken = getSessionApiIdToken(apiTokenSession);
  const isSessionLoading = status === "loading" || !isPendingChecked;
  const isAuthenticated = status === "authenticated";
  const requiresLoginForSubmit =
    !session || !isAuthenticated || !submitToken || isAuthSessionError(sessionError) || needsReauth;

  const startLoginForSubmit = useCallback(() => {
    savePendingScore(false);
    hasAutoSubmitted.current = false;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    signIn("google");
  }, [savePendingScore]);

  // 점수 제출
  const handleSubmitScore = useCallback(
    async (token?: string) => {
      // 이미 제출되었거나, 제출 중이면 중단
      if (isSubmitted || isSubmitting || isSubmittingRef.current) return;

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      try {
        const result = await submitScore({ gameName, score, playTime }, token);
        if (result.success && result.data) {
          setIsSubmitted(true);
          setResultId(result.data.id);
          setRank(result.data.rank ?? null);
          setWeeklyRank(result.data.weeklyRank ?? null);
          setBestScore(result.data.bestScore ?? null);
          setNeedsReauth(false);
          toast.success(t("submitSuccess"));
        } else if (result.requiresAuth) {
          savePendingScore(true);
          setNeedsReauth(true);
          toast.error(t("submitFail"));
        } else if (result.unavailable) {
          toast.error(t("apiUnavailable"), { id: "api-unavailable" });
        } else {
          toast.error(t("submitFail"));
        }
      } catch {
        toast.error(t("submitFail"));
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [gameName, score, playTime, isSubmitting, isSubmitted, savePendingScore, t],
  );

  const handleScoreAction = useCallback(() => {
    // 중복 실행 방지
    if (isSubmittingRef.current || isSessionLoading) return;
    if (requiresLoginForSubmit) {
      startLoginForSubmit();
      return;
    }
    handleSubmitScore(submitToken);
  }, [
    isSessionLoading,
    requiresLoginForSubmit,
    startLoginForSubmit,
    handleSubmitScore,
    submitToken,
  ]);

  // 이전 자동 제출 실패(401) 상태 복원
  useEffect(() => {
    const pending = readPendingScore();
    setIsPendingChecked(true);
    if (pending?.requiresManualLogin) {
      setNeedsReauth(true);
      return;
    }
    setNeedsReauth(false);
  }, [readPendingScore]);

  // 자동 제출: 정상 로그인 상태에서만 1회 시도
  useEffect(() => {
    if (score <= 0 || isSubmitted || isSubmitting || hasAutoSubmitted.current) return;
    if (requiresLoginForSubmit || isSessionLoading) return;
    hasAutoSubmitted.current = true;
    handleSubmitScore(submitToken);
  }, [
    score,
    isSubmitted,
    isSubmitting,
    requiresLoginForSubmit,
    isSessionLoading,
    handleSubmitScore,
    submitToken,
  ]);

  // 제출 성공 시 스토리지 정리
  useEffect(() => {
    if (isSubmitted) {
      try {
        localStorage.removeItem("pendingScore");
      } catch {
        /* 저장소 접근 제한 */
      }
    }
  }, [isSubmitted]);

  // 공유하기 (Web Share API)
  const handleShare = useCallback(async () => {
    if (isSharing) return;

    // 1. 점수 ID가 있으면 바로 공유
    if (resultId) {
      setIsSharing(true);
      try {
        await share({ score, gameName, id: resultId });
      } finally {
        setIsSharing(false);
      }
      return;
    }

    // 2. 로그인되어 있지 않거나, 제출이 안 된 경우 모달 띄우기
    if (!session || !isSubmitted) {
      setShowLoginDialog(true);
      return;
    }
  }, [score, gameName, share, isSharing, resultId, session, isSubmitted]);

  // 자동 공유 처리 (로그인/제출 후 복귀 시)
  useEffect(() => {
    try {
      if (resultId && localStorage.getItem("pendingShare") === "true") {
        localStorage.removeItem("pendingShare");
        // 브라우저 정책상 자동 share가 막힐 수 있으므로 try-catch
        share({ score, gameName, id: resultId }).catch(() => {
          // 실패하면 토스트나 알림 등으로 유도 (이미 share 내부에서 처리됨/fallback)
        });
      }
    } catch {
      /* 저장소 접근 제한 시 수동 공유만 제공한다. */
    }
  }, [resultId, share, score, gameName]);

  const handleConfirmLogin = () => {
    setShowLoginDialog(false);
    try {
      localStorage.setItem("pendingShare", "true");
    } catch {
      /* 저장소 접근 제한 */
    }
    handleScoreAction();
  };

  const medal = getMedalForGame(gameName, score);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="sky-drop-result">
      <Button
        type="button"
        onClick={() => {
          clearSkyDropPendingScore();
          router.push("/game");
        }}
        variant="ghost"
        className="min-h-11 self-start text-muted-foreground"
      >
        <ArrowLeft aria-hidden="true" />
        {t("goToDashboard")}
      </Button>
      <div className="my-auto flex flex-col items-center py-6 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-coral-400">{t("gameOver")}</h2>
        <p className="mt-5 text-sm text-muted-foreground">{t("finalScore")}</p>
        <div className="mt-2 flex items-center gap-3">
          {medal && <span className="text-4xl">{medal}</span>}
          <p className="text-5xl font-bold tabular-nums" data-testid="sky-drop-final-score">
            {score.toLocaleString()}
          </p>
        </div>
        {isSubmitted ? (
          <dl className="mt-5 grid w-full max-w-xs grid-cols-2 gap-2 rounded-xl border border-border bg-card p-4">
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">{t("currentRank")}</dt>
              <dd className="text-2xl font-bold text-yellow-500">{rank ? `#${rank}` : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("weeklyRank")}</dt>
              <dd className="text-lg font-semibold">{weeklyRank ? `#${weeklyRank}` : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("bestScore")}</dt>
              <dd className="text-lg font-semibold text-green-300">
                {bestScore?.toLocaleString() ?? "—"}
              </dd>
            </div>
            {bestScore !== null && score >= bestScore && (
              <div className="col-span-2 text-xs font-semibold text-coral-400">
                {t("newRecord")}
              </div>
            )}
          </dl>
        ) : (
          score > 0 && <p className="mt-4 text-xs text-muted-foreground">{t("rankPrompt")}</p>
        )}
        <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
          {score > 0 && (
            <>
              <Button
                type="button"
                onClick={handleShare}
                disabled={isSharing || isSubmitting}
                variant="outline"
                className="min-h-11"
                data-testid="sky-drop-share"
              >
                {isSharing ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Share2 aria-hidden="true" />
                )}
                {t("share")}
              </Button>
              <Button
                type="button"
                onClick={handleScoreAction}
                disabled={isSubmitting || isSubmitted || isSharing || isSessionLoading}
                className="min-h-11"
                data-testid="sky-drop-submit"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : requiresLoginForSubmit ? (
                  <LogIn aria-hidden="true" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                {isSubmitting
                  ? t("submitting")
                  : isSubmitted
                    ? t("submitted")
                    : requiresLoginForSubmit
                      ? t("loginAndSubmit")
                      : t("submitScore")}
              </Button>
            </>
          )}
          <Button
            type="button"
            onClick={onRestart}
            disabled={isSubmitting || isSharing}
            className="min-h-12 bg-teal-400 text-gray-900 hover:bg-teal-500"
            data-testid="sky-drop-restart"
          >
            <RotateCcw aria-hidden="true" />
            {t("restart")}
          </Button>
        </div>
      </div>
      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent className="z-[105]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("skyDrop.loginTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("skyDrop.loginDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("skyDrop.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLogin}>
              {t("loginAndSubmit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {isSubmitting && (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/80"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="mr-2 animate-spin" aria-hidden="true" />
          {t("submitting")}
        </div>
      )}
    </div>
  );
};
