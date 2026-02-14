"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useLinkShare } from "@/hooks/use-link-share";

interface ShareOptions {
  score: number;
  gameName: string;
  id?: string;
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
  const { canShare, shareLink, copyLink } = useLinkShare();

  // 공유 URL 생성
  const getShareUrl = useCallback(
    ({ score, gameName, id }: ShareOptions): string => {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      if (id) {
        return `${baseUrl}/${locale}/share/${id}`;
      }
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
    ({ score, gameName }: ShareOptions): string => {
      const randomIndex = Math.floor(Math.random() * 5);
      const gameTitle = formatGameTitle(gameName);
      return t(`shareMessages.${randomIndex}`, { score, gameName: gameTitle });
    },
    [t],
  );

  // 클립보드에 복사 (먼저 정의)
  const copyToClipboard = useCallback(
    async (options: ShareOptions): Promise<void> => {
      const shareUrl = getShareUrl(options);
      const shareText = getShareText(options);
      await copyLink({ url: shareUrl, text: shareText });
    },
    [copyLink, getShareUrl, getShareText],
  );

  // Web Share API를 통한 공유
  const share = useCallback(
    async (options: ShareOptions): Promise<void> => {
      const shareUrl = getShareUrl(options);
      const shareText = getShareText(options);
      const gameTitle = formatGameTitle(options.gameName);
      await shareLink({ title: gameTitle, text: shareText, url: shareUrl });
    },
    [getShareUrl, getShareText, shareLink],
  );

  return {
    share,
    copyToClipboard,
    canShare,
    getShareUrl,
  };
};
