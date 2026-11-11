"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGame } from "@/contexts/game-context";
import { usePathname } from "next/navigation";
import { PanelLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export const MobileSidebarTrigger = () => {
  const t = useTranslations("sidebar");
  const { openMobile, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const { isGamePlaying } = useGame();
  const pathname = usePathname();

  // Wordle 페이지인지 확인 (모바일에서 숨김)
  const isWordlePage = pathname?.includes("/game/wordle");

  // 게임 화면은 기존처럼 탐색 영역 없이 전체 높이를 사용한다.
  if (!isMobile || isGamePlaying || isWordlePage) {
    return null;
  }

  return (
    <div className="flex size-12 shrink-0 items-center justify-center print:hidden">
      {!openMobile && (
        <Button
          id="mobile-sidebar-trigger"
          onClick={() => setOpenMobile(true)}
          size="icon"
          className="size-11"
          data-testid="sidebar-trigger-mobile"
        >
          <PanelLeftIcon className="size-6" />
          <span className="sr-only">{t("explorer")}</span>
        </Button>
      )}
    </div>
  );
};
