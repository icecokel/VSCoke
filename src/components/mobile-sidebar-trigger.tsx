"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { PanelLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MobileSidebarTrigger = () => {
  const { openMobile, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();

  if (!isMobile || openMobile) {
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
