"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { toast } from "sonner";

interface ShareOptions {
  score: number;
  gameName: string;
}

interface UseGameShareReturn {
  share: (options: ShareOptions) => Promise<void>;
  copyToClipboard: (options: ShareOptions) => Promise<void>;
  canShare: boolean;
  getShareUrl: (options: ShareOptions) => string;
}

export const useGameShare = (): UseGameShareReturn => {
  const t = useTranslations("Game");
  const locale = useLocale();

  // Web Share API 지원 여부 확인
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  // 공유 URL 생성
  const getShareUrl = useCallback(
    ({ score, gameName }: ShareOptions): string => {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      return `${baseUrl}/${locale}/game/${gameName}/${score}/share`;
    },
    [locale],
  );

  // 게임 이름을 표시용으로 포맷팅
  const formatGameTitle = (gameName: string): string => {
    return gameName
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // 공유 텍스트 생성
  const getShareText = useCallback(
    ({ score }: ShareOptions): string => {
      const randomIndex = Math.floor(Math.random() * 5);
      return t(`shareMessages.${randomIndex}`, { score });
    },
    [t],
  );

  // 클립보드에 복사 (먼저 정의)
  const copyToClipboard = useCallback(
    async (options: ShareOptions): Promise<void> => {
      const shareUrl = getShareUrl(options);
      const shareText = getShareText(options);
      const fullText = `${shareText}\n${shareUrl}`;

      try {
        await navigator.clipboard.writeText(fullText);
        toast.success(t("copied"));
      } catch {
        // 클립보드 API 미지원 시 폴백
        const textArea = document.createElement("textarea");
        textArea.value = fullText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success(t("copied"));
      }
    },
    [getShareUrl, getShareText, t],
  );

  // Web Share API를 통한 공유
  const share = useCallback(
    async (options: ShareOptions): Promise<void> => {
      const shareUrl = getShareUrl(options);
      const shareText = getShareText(options);
      const gameTitle = formatGameTitle(options.gameName);

      if (canShare) {
        try {
          await navigator.share({
            title: gameTitle,
            text: shareText,
            url: shareUrl,
          });
        } catch (error) {
          // 사용자가 공유를 취소한 경우 에러가 발생하지만 무시
          if ((error as Error).name !== "AbortError") {
            // 공유 실패 시 클립보드 복사로 폴백
            await copyToClipboard(options);
          }
        }
      } else {
        // Web Share API 미지원 시 클립보드 복사
        await copyToClipboard(options);
      }
    },
    [canShare, getShareUrl, getShareText, copyToClipboard],
  );

  return {
    share,
    copyToClipboard,
    canShare,
    getShareUrl,
  };
};
