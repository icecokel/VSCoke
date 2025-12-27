import { getTranslations } from "next-intl/server";
import { CustomLink } from "@/components/custom-link";
import { getBlockTowerMedal } from "@/utils/block-tower-util";

import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ locale: string; score: string }>;
}

export const generateMetadata = async ({ params }: Props) => {
  const { locale, score: scoreParam } = await params;
  const score = scoreParam ? parseInt(scoreParam, 10) : 0;
  const t = await getTranslations({ locale, namespace: "Game" });

  return {
    title: `Block Tower - ${score}점`,
    description: t("shareDescription", { score }),
    openGraph: {
      title: `Block Tower - ${score}점`,
      description: t("shareDescription", { score }),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Block Tower - ${score}점`,
      description: t("shareDescription", { score }),
    },
  };
};

const SharePage = async ({ params }: Props) => {
  const { locale, score: scoreParam } = await params;
  const score = scoreParam ? parseInt(scoreParam, 10) : 0;
  const t = await getTranslations({ locale, namespace: "Game" });

  return (
    <main className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* 상단 뒤로가기 버튼 */}
      <CustomLink
        href="/game"
        className="absolute top-6 left-6 flex items-center gap-2 text-white/50 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
        <span className="text-lg font-medium">{t("goToDashboard")}</span>
      </CustomLink>
      <div className="max-w-md w-full text-center">
        {/* 게임 로고 */}
        <div className="text-5xl font-bold text-[#FF6B6B] mb-4 tracking-wider">🏗️ BLOCK TOWER</div>

        {/* 구분선 */}
        <div className="w-20 h-1 bg-gradient-to-r from-[#FF6B6B] to-[#FFE66D] rounded-full mx-auto my-6" />

        {/* 점수 */}
        <div className="mb-8">
          <p className="text-gray-400 text-lg mb-2">SCORE</p>
          <div className="flex items-center justify-center gap-4">
            {getBlockTowerMedal(score) && (
              <span className="text-6xl filter drop-shadow-lg">{getBlockTowerMedal(score)}</span>
            )}
            <p className="text-7xl font-black text-white tracking-widest">
              {score.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 도전 메시지 */}
        <p className="text-gray-400 text-lg mb-8">{t("beatThisScore")}</p>

        {/* 플레이 버튼 */}
        <CustomLink
          href="/game/block-tower"
          className="inline-flex items-center justify-center w-full py-4 px-8 bg-gradient-to-r from-[#FF6B6B] to-[#ff5757] hover:from-[#ff5757] hover:to-[#e94f4f] text-white font-bold text-xl rounded-xl shadow-lg transition-all transform hover:scale-105"
        >
          {t("playNow")}
        </CustomLink>

        {/* 대시보드 링크 */}
        <CustomLink
          href="/game"
          className="inline-flex items-center justify-center w-full py-6 px-10 mt-4 text-gray-400 border-2 border-gray-700 hover:border-gray-500 hover:text-white font-bold text-2xl rounded-xl transition-all"
        >
          {t("goToDashboard")}
        </CustomLink>
      </div>
    </main>
  );
};

export default SharePage;
