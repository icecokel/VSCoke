"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { useGameShare } from "@/hooks/use-game-share";
import { useSession, signIn } from "next-auth/react";
// ... imports
import { Share2, RotateCcw, ArrowLeft, Save, Loader2, LogIn } from "lucide-react";
import { getSkyDropMedal } from "@/utils/sky-drop-util";
import { submitScore } from "@/services/score-service";
import { toast } from "sonner";
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
  onRestart: () => void;
}

export const ResultScreen = ({ score, gameName, onRestart }: ResultScreenProps) => {
  const t = useTranslations("Game");
  const router = useCustomRouter();
  const { data: session } = useSession();
  const { share } = useGameShare();
  const [isSharing, setIsSharing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resultId, setResultId] = useState<string | undefined>(undefined);
  const [rank, setRank] = useState<number | null>(null);
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const hasAutoSubmitted = useRef(false);
  const isSubmittingRef = useRef(false);

  // 점수 제출
  const handleSubmitScore = useCallback(
    async (token?: string) => {
      // 이미 제출되었거나, 제출 중이면 중단
      if (isSubmitted || isSubmitting || isSubmittingRef.current) return;

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      try {
        const result = await submitScore({ gameName, score }, token);
        if (result.success && result.data) {
          setIsSubmitted(true);
          setResultId(result.data.id);
          setRank(result.data.rank ?? null);
          setWeeklyRank(result.data.weeklyRank ?? null);
          setBestScore(result.data.bestScore ?? null);
          toast.success(result.message || t("submitSuccess"));
        } else {
          toast.error(result.message || t("submitFail"));
        }
      } catch {
        toast.error(t("submitFail"));
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [gameName, score, isSubmitting, isSubmitted, t],
  );

  const handleScoreAction = useCallback(() => {
    // 중복 실행 방지
    if (isSubmittingRef.current) return;

    // 세션 에러(토큰 갱신 실패) 시 재로그인 유도
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionError = (session as any)?.error;
    if (sessionError === "RefreshAccessTokenError") {
      localStorage.setItem(
        "pendingScore",
        JSON.stringify({ gameName, score, timestamp: Date.now() }),
      );
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      signIn("google");
      return;
    }

    if (!session) {
      localStorage.setItem(
        "pendingScore",
        JSON.stringify({ gameName, score, timestamp: Date.now() }),
      );
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      signIn("google");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = (session as any)?.idToken;

    if (!token) {
      localStorage.setItem(
        "pendingScore",
        JSON.stringify({ gameName, score, timestamp: Date.now() }),
      );
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      signIn("google");
      return;
    }

    handleSubmitScore(token);
  }, [session, handleSubmitScore, gameName, score]);

  // 로그인 상태면 결과 화면 진입 시 자동 제출
  useEffect(() => {
    if (!session || score <= 0 || isSubmitted || isSubmitting || hasAutoSubmitted.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = (session as any)?.idToken;
    if (!token) return;

    hasAutoSubmitted.current = true;
    handleSubmitScore(token);
  }, [session, score, isSubmitted, isSubmitting, handleSubmitScore]);

  // 제출 성공 시 스토리지 정리
  useEffect(() => {
    if (isSubmitted) {
      localStorage.removeItem("pendingScore");
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
    if (resultId && localStorage.getItem("pendingShare") === "true") {
      localStorage.removeItem("pendingShare");
      // 브라우저 정책상 자동 share가 막힐 수 있으므로 try-catch
      share({ score, gameName, id: resultId }).catch(() => {
        // 실패하면 토스트나 알림 등으로 유도 (이미 share 내부에서 처리됨/fallback)
      });
    }
  }, [resultId, share, score, gameName]);

  const handleConfirmLogin = () => {
    setShowLoginDialog(false);
    localStorage.setItem("pendingShare", "true"); // 공유 의도 저장
    handleScoreAction();
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center animate-in fade-in duration-300">
      {/* 상단 좌측 뒤로가기 버튼 */}
      <Button
        onClick={() => router.push("/game")}
        variant="ghost"
        aria-label="Go to Dashboard"
        className="absolute top-4 left-4 text-white hover:bg-white/10 rounded-full w-auto h-12 px-4"
      >
        <div className="flex items-center gap-2">
          <ArrowLeft className="h-6 w-6" />
          {t("goToDashboard")}
        </div>
      </Button>

      <h2 className="text-5xl font-bold text-coral-400 mb-8 drop-shadow-[0_0_10px_rgba(255,107,107,0.5)]">
        GAME OVER
      </h2>

      <div className="mb-8">
        <p className="text-gray-400 text-lg mb-2">{t("finalScore")}</p>
        <div className="flex items-center justify-center gap-4">
          {getMedalForGame(gameName, score) && (
            <span className="text-6xl filter drop-shadow-lg">
              {getMedalForGame(gameName, score)}
            </span>
          )}
          <p className="text-6xl font-black text-white tracking-widest">{score}</p>
        </div>

        {/* 랭킹 유도 문구 (기록 전) */}
        {!isSubmitted && score > 0 && (
          <p className="mt-4 text-amber-400 text-sm animate-pulse">{t("rankPrompt")}</p>
        )}

        {/* 랭킹 결과 (기록 후) */}
        {isSubmitted && (
          <div className="mt-6 w-full max-w-sm grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 내 순위 (통합) */}
            <div className="col-span-2 bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center">
              <p className="text-gray-400 text-sm mb-1">{t("currentRank")}</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-yellow-400">
                  {rank ? `#${rank}` : "-"}
                </span>
                <span className="text-sm text-gray-500 mb-1.5">/ {t("overall")}</span>
              </div>
            </div>

            {/* 주간 랭킹 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center">
              <p className="text-gray-400 text-xs mb-1">{t("weeklyRank")}</p>
              <span className="text-xl font-bold text-sky-400">
                {weeklyRank ? `#${weeklyRank}` : "-"}
              </span>
            </div>

            {/* 최고 점수 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center relative overflow-hidden">
              <p className="text-gray-400 text-xs mb-1">{t("bestScore")}</p>
              <span className="text-xl font-bold text-emerald-400">
                {bestScore?.toLocaleString() ?? "-"}
              </span>
              {bestScore && score >= bestScore && (
                <div className="absolute top-0 right-0 bg-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded-bl-lg animate-pulse">
                  {t("newRecord")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {score > 0 && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {/* 공유하기 버튼 */}
          <Button
            onClick={handleShare}
            disabled={isSharing || isSubmitting}
            size="lg"
            aria-label="Share Result"
            className="w-full text-lg py-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSharing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                공유 중...
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-5 w-5" />
                {t("share")}
              </>
            )}
          </Button>

          {/* 점수 기록하기 버튼 */}
          <Button
            onClick={handleScoreAction}
            disabled={isSubmitting || isSubmitted || isSharing}
            size="lg"
            aria-label="Submit Score"
            className={`w-full text-lg py-6 font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed ${
              isSubmitted
                ? "bg-green-500 hover:bg-green-600 text-white"
                : !session
                  ? "bg-white hover:bg-gray-100 text-black border border-gray-200"
                  : "bg-indigo-500 hover:bg-indigo-600 text-white"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t("submitting")}
              </>
            ) : !isSubmitted && !session ? (
              // Google Icon (Simple SVG)
              <div className="flex items-center">
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.21.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {t("loginAndSubmit")}
              </div>
            ) : (
              <>
                {isSubmitted ? (
                  <div className="flex items-center">{t("submitted")}</div>
                ) : (
                  <div className="flex items-center">
                    <Save className="mr-2 h-5 w-5" />
                    {t("submitScore")}
                  </div>
                )}
              </>
            )}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs mt-3">
        {/* 다시하기 버튼 */}
        <Button
          onClick={onRestart}
          disabled={isSubmitting || isSharing}
          size="lg"
          aria-label="Restart Game"
          className="w-full text-lg py-6 bg-teal-400 hover:bg-teal-500 text-black font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          {t("restart")}
        </Button>
      </div>

      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent className="bg-black border border-white/20 text-white max-w-sm rounded-2xl shadow-2xl z-[105]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center">
              로그인이 필요합니다
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 text-center">
              공유하려면 점수 기록이 필요합니다.
              <br />
              로그인하고 기록하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 sm:flex-col mt-6">
            <AlertDialogAction
              onClick={handleConfirmLogin}
              className="w-full py-6 rounded-xl text-lg font-bold flex items-center justify-center"
            >
              <LogIn className="mr-2 h-5 w-5" />
              로그인하고 기록하기
            </AlertDialogAction>
            <AlertDialogCancel className="w-full py-6 rounded-xl text-lg mt-2 border-zinc-700 hover:bg-zinc-900 hover:text-white transition-colors">
              취소
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isSubmitting && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            className="flex min-w-52 flex-col items-center gap-3 rounded-2xl border border-white/15 bg-zinc-950/90 px-6 py-5 shadow-2xl"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
            <p className="text-sm font-medium text-white">{t("submitting")}</p>
          </div>
        </div>
      )}
    </div>
  );
};
