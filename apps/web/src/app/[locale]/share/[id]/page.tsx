import { getTranslations } from "next-intl/server";
import { CustomLink } from "@/components/custom-link";
import { getSkyDropMedal } from "@/utils/sky-drop-util";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getGameResult } from "@/services/score-service";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { locale, id } = await params;
  const result = await getGameResult(id);
  const t = await getTranslations({ locale, namespace: "Game" });

  if (!result) {
    return {
      title: "Game Result Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const gameTitle = result.gameType === "SKY_DROP" ? "Sky Drop" : "Game";
  const scoreTitle = `${gameTitle} - ${result.score}${t("scorePointSuffix")}`;

  return {
    title: scoreTitle,
    description: t("shareDescription", { score: result.score }),
    openGraph: {
      title: scoreTitle,
      description: t("shareDescription", { score: result.score }),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: scoreTitle,
      description: t("shareDescription", { score: result.score }),
    },
    robots: {
      index: false,
      follow: false,
    },
  };
};

const SharePage = async ({ params }: Props) => {
  const { locale, id } = await params;
  const result = await getGameResult(id);
  const t = await getTranslations({ locale, namespace: "Game" });

  if (!result) {
    notFound();
  }

  const isSkyDrop = result.gameType === "SKY_DROP";

  let gameTitle, playLink, colorClass, fromColor, toColor;

  // Fallback for interactions with deleted games
  if ((result.gameType as string) === "BLOCK_TOWER") {
    gameTitle = "BLOCK TOWER (Archived)";
    playLink = "/game";
    colorClass = "text-gray-400";
    fromColor = "#9ca3af";
    toColor = "#4b5563";
  } else {
    gameTitle = "🎮 SKY DROP";
    playLink = "/game/sky-drop";
    colorClass = "text-[#4ECDC4]";
    fromColor = "#4ECDC4";
    toColor = "#FF6B6B";
  }

  // 메달 가져오기
  const medal = isSkyDrop ? getSkyDropMedal(result.score) : null;

  // 날짜 포맷
  const date = new Date(result.createdAt).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* 상단 뒤로가기 버튼 */}
      <CustomLink
        href="/game"
        className="absolute top-6 left-6 flex items-center gap-2 text-white/50 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
        <span className="text-lg font-medium">{t("goToDashboard")}</span>
      </CustomLink>

      <div className="max-w-md w-full text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* 날짜 */}
        <p className="text-gray-500 mb-2 font-medium">{date}</p>

        {/* 게임 로고 */}
        <div className={`text-5xl font-bold mb-4 tracking-wider ${colorClass}`}>{gameTitle}</div>

        {/* 구분선 */}
        <div
          className="w-20 h-1 rounded-full mx-auto my-6"
          style={{ background: `linear-gradient(90deg, ${fromColor}, ${toColor})` }}
        />

        {/* 점수 */}
        <div className="mb-8">
          <p className="text-gray-400 text-lg mb-2">SCORE</p>
          <div className="flex items-center justify-center gap-4">
            {medal && (
              <span className="text-6xl filter drop-shadow-lg animate-bounce duration-1000">
                {medal}
              </span>
            )}
            <p className="text-7xl font-black text-white tracking-widest drop-shadow-2xl">
              {result.score?.toLocaleString() ?? 0}
            </p>
          </div>
        </div>

        {/* 도전 메시지 */}
        <p className="text-gray-400 text-lg mb-8">{t("beatThisScore")}</p>

        {/* 플레이 버튼 */}
        <CustomLink
          href={playLink}
          className="inline-flex items-center justify-center w-full py-4 px-8 mb-4 text-black font-bold text-xl rounded-xl shadow-lg transition-all transform hover:scale-105 hover:brightness-110"
          style={{
            background: `linear-gradient(90deg, ${fromColor}, ${isSkyDrop ? "#45b7aa" : "#FFA050"})`,
          }}
        >
          {t("playNow")}
        </CustomLink>

        {/* 대시보드 링크 */}
        <CustomLink
          href="/game"
          className="inline-flex items-center justify-center w-full py-4 px-10 text-gray-400 border-2 border-gray-700 hover:border-gray-500 hover:text-white font-bold text-xl rounded-xl transition-all"
        >
          {t("goToDashboard")}
        </CustomLink>
      </div>
    </main>
  );
};

export default SharePage;
