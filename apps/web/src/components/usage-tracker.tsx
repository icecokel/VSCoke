"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackUsageEvent } from "@/lib/usage-analytics";

export const UsageTracker = () => {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;
    void trackUsageEvent("page_view", undefined, { path: pathname });
  }, [pathname]);

  return null;
};
