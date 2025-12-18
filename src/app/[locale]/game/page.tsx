"use client";

import Link from "next/link";
import { useLocale } from "next-intl";

export default function GameDashboard() {
  const locale = useLocale();

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-start bg-slate-900 p-8 text-white">
      <div className="w-full max-w-5xl">
        <h1 className="mb-2 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
          게임 센터
        </h1>
        <p className="mb-10 text-slate-400">플레이할 게임을 선택하세요</p>

        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Sky Drop Card */}
          <Link
            href={`/${locale}/game/sky-drop`}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-800 transition-all hover:-translate-y-1 hover:border-teal-400 hover:shadow-xl hover:shadow-teal-400/20"
          >
            <div className="flex h-48 items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 p-4 group-hover:from-slate-700 group-hover:to-slate-600 transition-colors">
              <span className="text-7xl filter drop-shadow-lg transition-transform group-hover:scale-110">
                🧩
              </span>
            </div>
            <div className="p-5">
              <h2 className="mb-2 text-xl font-bold group-hover:text-teal-400">Sky Drop</h2>
              <p className="text-sm text-gray-400">
                블록 3개를 수직으로 맞춰보세요! 반응형 퍼즐 게임에 도전하세요.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-700 px-2 py-1 text-xs text-teal-300">
                  퍼즐
                </span>
                <span className="rounded-full bg-slate-700 px-2 py-1 text-xs text-blue-300">
                  캐주얼
                </span>
              </div>
            </div>
          </Link>

          {/* Placeholder for more games */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-6 text-center text-gray-500 hover:bg-slate-800/50 transition-colors cursor-default">
            <span className="mb-4 text-4xl opacity-50">🚧</span>
            <h3 className="font-semibold">준비 중</h3>
            <p className="text-sm mt-1">더 많은 게임이 개발 중입니다.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
