"use client";

import { useEffect, useState } from "react";
import { getBeatJevAvailability } from "@/services/beat-jev-service";

export const useBeatJevAvailability = (): boolean | null => {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    getBeatJevAvailability()
      .then(enabled => {
        if (isMounted) setIsEnabled(enabled);
      })
      .catch(() => {
        if (isMounted) setIsEnabled(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return isEnabled;
};
