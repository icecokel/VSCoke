"use client";

import { useEffect, useState } from "react";

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let container: HTMLElement | null = null;
    let requestFrameId: number;

    const handleScroll = () => {
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const windowHeight = scrollHeight - clientHeight;

      if (windowHeight === 0) {
        setProgress(0);
        return;
      }

      const scroll = scrollTop / windowHeight;
      setProgress(Math.min(1, Math.max(0, scroll)));
    };

    const attachListener = () => {
      container = document.getElementById("main-scroll-container");
      if (container) {
        container.addEventListener("scroll", handleScroll);
        // Initial calculation
        handleScroll();
      } else {
        // Retry if not found yet (e.g., during hydration/render)
        requestFrameId = requestAnimationFrame(attachListener);
      }
    };

    attachListener();

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
      if (requestFrameId) {
        cancelAnimationFrame(requestFrameId);
      }
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-50 bg-transparent">
      <div
        className="h-full bg-yellow-200 transition-all duration-150 ease-out origin-left"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
