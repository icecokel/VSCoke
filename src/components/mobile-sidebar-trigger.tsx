"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGame } from "@/contexts/game-context";
import { usePathname } from "next/navigation";
import { PanelLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MobileSidebarTrigger = () => {
  const { openMobile, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const { isGamePlaying } = useGame();
  const pathname = usePathname();

  // Wordle 페이지인지 확인 (모바일에서 숨김)
  const isWordlePage = pathname?.includes("/game/wordle");

  // 모바일이 아니거나, 사이드바가 열려있거나, 게임 진행 중이거나, Wordle 페이지일 때 숨김
  if (!isMobile || openMobile || isGamePlaying || isWordlePage) {
    return null;
  }

  return (
    <Button
      onClick={() => setOpenMobile(true)}
      size="icon"
      className="fixed bottom-4 right-4 z-50 size-12 rounded-full shadow-lg"
    >
      <PanelLeftIcon className="size-6" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
};
