"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "vscoke-history";

interface IHistoryItem {
  title: string;
  path: string;
  isActive: boolean;
}

export default function GlobalNotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    // localStorage에서 히스토리 가져오기
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      router.replace("/");
      return;
    }

    try {
      const history: IHistoryItem[] = JSON.parse(stored);
      const invalidTabIndex = history.findIndex(item => item.path === pathname);

      if (invalidTabIndex !== -1) {
        // 다음 이동할 탭 결정 (오른쪽 → 왼쪽 → 홈)
        const nextTab = history[invalidTabIndex + 1] || history[invalidTabIndex - 1];

        // 탭 제거
        const updatedHistory = history.filter((_, index) => index !== invalidTabIndex);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));

        // 다음 탭으로 이동 (없으면 홈으로)
        router.replace(nextTab?.path || "/");
      } else {
        // 히스토리에 없는 경우 홈으로
        router.replace("/");
      }
    } catch {
      router.replace("/");
    }
  }, [pathname, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
      <p className="text-gray-400 mb-6">Could not find requested resource</p>
      <p className="text-gray-500 mb-4 text-sm">Redirecting...</p>
      <Link href="/" className="text-blue-400 hover:text-blue-300 hover:underline">
        Return Home
      </Link>
    </div>
  );
}
