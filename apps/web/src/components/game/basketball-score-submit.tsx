"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { getSessionApiIdToken, type ApiTokenSession } from "@/lib/auth-token";
import { submitScore, type GameHistoryResponseDto } from "@/services/score-service";
import {
  clearPendingBasketballScore,
  readPendingBasketballScore,
  savePendingBasketballScore,
} from "./basketball-pending-score";

interface SubmitProps {
  score: number;
}

export const BasketballScoreSubmit = ({ score }: SubmitProps) => {
  const t = useTranslations("Game");
  const basketball = useTranslations("Game.arcadeBasketball");
  const { data: session, status } = useSession();
  const token = getSessionApiIdToken(session as ApiTokenSession | null);
  const [result, setResult] = useState<GameHistoryResponseDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const autoSubmitted = useRef(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  const sendScore = async () => {
    if (!token || lock.current || result) return;
    lock.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await submitScore(
        { gameName: "arcade-basketball", score, playTime: 30 },
        token,
      );
      if (response.success && response.data) {
        setResult(response.data);
        clearPendingBasketballScore();
      } else {
        if (response.requiresAuth) setNeedsLogin(true);
        setError(t(response.unavailable ? "apiUnavailable" : "submitFail"));
      }
    } finally {
      lock.current = false;
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (status !== "authenticated" || !token || autoSubmitted.current) return;
    const pending = readPendingBasketballScore();
    if (pending?.score !== score) return;
    autoSubmitted.current = true;
    void sendScore();
  });

  const onSubmit = () => {
    if (status === "loading" || lock.current || result) return;
    if (!token || needsLogin) {
      if (!savePendingBasketballScore(score)) {
        setError(basketball("loginStorageError"));
        return;
      }
      void signIn("google", { callbackUrl: window.location.href });
      return;
    }
    void sendScore();
  };

  if (score < 1) return null;
  return (
    <div className="grid w-full max-w-xs gap-2" data-testid="basketball-score-submit">
      {result ? (
        <p role="status" className="text-sm text-orange-300">
          {basketball("rankResult", { rank: result.rank ?? "—", best: result.bestScore ?? score })}
        </p>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={onSubmit}
          disabled={isSubmitting || status === "loading"}
        >
          {t(isSubmitting ? "submitting" : token && !needsLogin ? "submitScore" : "loginAndSubmit")}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-xs text-orange-200">
          {error}
        </p>
      )}
    </div>
  );
};
