import { getTranslations } from "next-intl/server";
import { CustomLink } from "@/components/custom-link";
import { getMedal } from "@/utils/sky-drop-util";

interface Props {
  params: Promise<{ locale: string; score: string }>;
}

export const generateMetadata = async ({ params }: Props) => {
  const { locale, score: scoreParam } = await params;
  const score = scoreParam ? parseInt(scoreParam, 10) : 0;
  const t = await getTranslations({ locale, namespace: "Game" });

  return {
    title: `Sky Drop - ${score}점`,
    description: t("shareDescription", { score }),
    openGraph: {
      title: `Sky Drop - ${score}점`,
      description: t("shareDescription", { score }),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Sky Drop - ${score}점`,
      description: t("shareDescription", { score }),
    },
  };
};

const SharePage = async ({ params }: Props) => {
  const { locale, score: scoreParam } = await params;
  const score = scoreParam ? parseInt(scoreParam, 10) : 0;
  const t = await getTranslations({ locale, namespace: "Game" });

  return (
    <main className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-md w-full text-center">
        {/* 게임 로고 */}
        <div className="text-5xl font-bold text-[#4ECDC4] mb-4 tracking-wider">🎮 SKY DROP</div>

        {/* 구분선 */}
        <div className="w-20 h-1 bg-gradient-to-r from-[#4ECDC4] to-[#FF6B6B] rounded-full mx-auto my-6" />

        {/* 점수 */}
        <div className="mb-8">
          <p className="text-gray-400 text-lg mb-2">SCORE</p>
          <div className="flex items-center justify-center gap-4">
            {score >= 5000 && (
              <span className="text-6xl filter drop-shadow-lg">{getMedal(score)}</span>
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
          href="/game/sky-drop"
          className="inline-flex items-center justify-center w-full py-4 px-8 bg-gradient-to-r from-[#4ECDC4] to-[#45b7aa] hover:from-[#45b7aa] hover:to-[#3fa89e] text-black font-bold text-xl rounded-xl shadow-lg transition-all transform hover:scale-105"
        >
          {t("playNow")}
        </CustomLink>

        {/* 대시보드 링크 */}
        <CustomLink
          href="/game"
          className="inline-block mt-4 text-gray-500 hover:text-gray-300 transition-colors"
        >
          {t("viewOtherGames")}
        </CustomLink>
      </div>
    </main>
  );
};

export default SharePage;
