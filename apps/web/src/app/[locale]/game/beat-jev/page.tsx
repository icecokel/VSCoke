"use client";

import { useEffect } from "react";
import { BeatJevGame } from "@/components/game/beat-jev-game";
import { useBeatJevAvailability } from "@/hooks/use-beat-jev-availability";
import { useRouter } from "@/i18n/navigation";

export default function BeatJevPage() {
  const isEnabled = useBeatJevAvailability();
  // 자동 이동의 방문 탭 동기화는 HistoryTabs에 맡긴다.
  const { replace } = useRouter();

  useEffect(() => {
    if (isEnabled === false) replace("/game");
  }, [isEnabled, replace]);

  return isEnabled === true ? <BeatJevGame /> : null;
}
