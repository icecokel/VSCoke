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

  // 로더 시작 시 표시 및 애니메이션
  useEffect(() => {
    if (isLoading && !visible) {
      setVisible(true);
      setProgress(8);

      // 8단계, 최대 1500ms - 처음엔 빠르게, 나중엔 천천히
      const timers = [
        setTimeout(() => setProgress(20), 80),
        setTimeout(() => setProgress(35), 200),
        setTimeout(() => setProgress(50), 380),
        setTimeout(() => setProgress(62), 580),
        setTimeout(() => setProgress(73), 820),
        setTimeout(() => setProgress(82), 1080),
        setTimeout(() => setProgress(89), 1320),
        setTimeout(() => setProgress(94), 1500),
      ];

      return () => timers.forEach(clearTimeout);
    }
  }, [isLoading, visible]);

  // 경로 변경 시 로더 완료 처리
  useEffect(() => {
    if (prevPathRef.current !== pathname && visible) {
      // 경로가 실제로 변경되었을 때
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        endLoader();
        setProgress(0);
      }, 300);

      prevPathRef.current = pathname;
      return () => clearTimeout(timer);
    }
    prevPathRef.current = pathname;
  }, [pathname, visible, endLoader]);

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
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#3b82f6" />
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
