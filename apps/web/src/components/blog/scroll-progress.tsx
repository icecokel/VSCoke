"use client";

import { useEffect, useState } from "react";
import { BLOG_SPEECH_CONTENT_ID } from "@/components/blog/blog-speech";

export default function ScrollProgress({ label }: { label: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = document.getElementById("main-scroll-container");
    const article = document.getElementById(BLOG_SPEECH_CONTENT_ID);
    if (!container) return;
    let frame = 0;

    const measure = () => {
      const distance = container.scrollHeight - container.clientHeight;
      setProgress(
        distance > 0
          ? Math.round(Math.min(1, Math.max(0, container.scrollTop / distance)) * 100)
          : 100,
      );
    };
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(container);
    if (article) observer.observe(article);
    container.addEventListener("scroll", scheduleMeasure, { passive: true });
    scheduleMeasure();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener("scroll", scheduleMeasure);
    };
  }, []);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      className="pointer-events-none sticky top-0 z-20 h-0.5 w-full bg-border/50"
    >
      <div
        className="h-full origin-left bg-primary"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
