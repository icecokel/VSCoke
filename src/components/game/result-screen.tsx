"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { useGameShare } from "@/hooks/use-game-share";
import { useSession, signIn } from "next-auth/react";
import { Share2, RotateCcw, ArrowLeft, Save } from "lucide-react";
import { getSkyDropMedal } from "@/utils/sky-drop-util";
import { getBlockTowerMedal } from "@/utils/block-tower-util";
import { submitScore } from "@/services/score-service";

// 게임별 메달 계산
const getMedalForGame = (gameName: string, score: number): string | null => {
  switch (gameName) {
    case "sky-drop":
      return getSkyDropMedal(score);
    case "block-tower":
      return getBlockTowerMedal(score);
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

  // 점수 제출
  const handleSubmitScore = useCallback(
    async (token?: string) => {
      if (isSubmitting || isSubmitted) return;

      setIsSubmitting(true);
      try {
        const result = await submitScore({ gameName, score }, token);
        if (result.success) {
          setIsSubmitted(true);
        } else {
          alert(result.message || t("submitFail")); // 실패 시 알림
        }
      } catch (error) {
        console.error("Failed to submit score:", error);
        alert(t("submitFail")); // 실패 시 알림
      } finally {
        setIsSubmitting(false);
      }
    },
    [gameName, score, isSubmitting, isSubmitted, t],
  );

  const handleScoreAction = useCallback(() => {
    if (!session) {
      // 로그인 전 점수 정보 저장
      localStorage.setItem(
        "pendingScore",
        JSON.stringify({
          gameName,
          score,
          timestamp: Date.now(),
        }),
      );
      signIn("google");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = (session as any)?.idToken;
    handleSubmitScore(token);
  }, [session, handleSubmitScore, gameName, score]);

  // 마운트 시 자동 제출 체크
  useEffect(() => {
    if (session && !isSubmitted && !isSubmitting) {
      const pending = localStorage.getItem("pendingScore");
      if (pending) {
        try {
          const { gameName: savedGame, score: savedScore, timestamp } = JSON.parse(pending);

          // 5분 이내의 데이터이고, 현재 표시된 점수와 일치하면 자동 제출
          const isValidTime = Date.now() - timestamp < 5 * 60 * 1000;
          if (savedGame === gameName && savedScore === score && isValidTime) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const token = (session as any)?.idToken;
            handleSubmitScore(token);
          }
        } catch (e) {
          console.error("Failed to parse pending score", e);
        }
      }
    }
  }, [session, isSubmitted, isSubmitting, gameName, score, handleSubmitScore]);

  // 제출 성공 시 스토리지 정리
  useEffect(() => {
    if (isSubmitted) {
      localStorage.removeItem("pendingScore");
    }
  }, [isSubmitted]);

  // 공유하기 (Web Share API)
  const handleShare = useCallback(async () => {
    if (isSharing) return;

    setIsSharing(true);
    try {
      await share({ score, gameName });
    } finally {
      setIsSharing(false);
    }
  }, [score, gameName, share, isSharing]);

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
      </div>

      {score > 0 && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {/* 공유하기 버튼 */}
          <Button
            onClick={handleShare}
            disabled={isSharing}
            size="lg"
            aria-label="Share Result"
            className="w-full text-lg py-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
          >
            <Share2 className="mr-2 h-5 w-5" />
            {isSharing ? "공유 중..." : t("share")}
          </Button>

          {/* 점수 기록하기 버튼 */}
          <Button
            onClick={handleScoreAction}
            disabled={isSubmitting || isSubmitted}
            size="lg"
            aria-label="Submit Score"
            className={`w-full text-lg py-6 font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 ${
              isSubmitted
                ? "bg-green-500 hover:bg-green-600 text-white"
                : !session
                  ? "bg-white hover:bg-gray-100 text-black border border-gray-200"
                  : "bg-indigo-500 hover:bg-indigo-600 text-white"
            }`}
          >
            {!isSubmitted && !session ? (
              // Google Icon (Simple SVG)
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
            ) : (
              <Save className="mr-2 h-5 w-5" />
            )}
            {isSubmitting
              ? "기록 중..."
              : isSubmitted
                ? "기록 완료"
                : !session
                  ? "Google 로그인하고 기록하기"
                  : t("submitScore")}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs mt-3">
        {/* 다시하기 버튼 */}
        <Button
          onClick={onRestart}
          size="lg"
          aria-label="Restart Game"
          className="w-full text-lg py-6 bg-teal-400 hover:bg-teal-500 text-black font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          {t("restart")}
        </Button>
      </div>
    </div>
  );
};
