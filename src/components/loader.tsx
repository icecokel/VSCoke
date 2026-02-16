"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLoader } from "@/contexts/loader-context";

export const Loader = () => {
  const pathname = usePathname();
  const { isLoading, endLoader } = useLoader();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPathRef = useRef(pathname);

  // 로더 시작 시 짧은 지연 후 표시하여 빠른 전환에서 깜빡임을 줄입니다.
  useEffect(() => {
    if (!isLoading) {
      setVisible(false);
      setProgress(0);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    const showTimer = setTimeout(() => {
      setVisible(true);
      setProgress(14);

      timers.push(
        setTimeout(() => setProgress(30), 100),
        setTimeout(() => setProgress(48), 220),
        setTimeout(() => setProgress(62), 380),
        setTimeout(() => setProgress(74), 560),
        setTimeout(() => setProgress(83), 760),
        setTimeout(() => setProgress(90), 980),
      );
    }, 120);

    timers.push(showTimer);

    return () => timers.forEach(clearTimeout);
  }, [isLoading]);

  // 경로 변경 시 로더 완료 처리
  useEffect(() => {
    if (prevPathRef.current !== pathname && isLoading) {
      // 표시 전 완료된 경우 즉시 종료
      if (!visible) {
        endLoader();
      } else {
        setProgress(100);
        const timer = setTimeout(() => {
          endLoader();
        }, 80);

        prevPathRef.current = pathname;
        return () => clearTimeout(timer);
      }
    }

    prevPathRef.current = pathname;
  }, [pathname, visible, isLoading, endLoader]);

  if (!visible) return null;

  // 원형 프로그레스 계산
  const radius = 40;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none">
      <div className="relative flex items-center justify-center">
        {/* 배경 원 */}
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={strokeWidth}
          />
          {/* 프로그레스 원 */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="url(#loader-gradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-out"
          />
          <defs>
            <linearGradient id="loader-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-blue-400)" />
              <stop offset="50%" stopColor="var(--color-teal-400)" />
              <stop offset="100%" stopColor="var(--color-blue-500)" />
            </linearGradient>
          </defs>
        </svg>
        {/* 퍼센트 표시 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white drop-shadow-lg">{progress}%</span>
        </div>
      </div>
    </div>
  );
};
