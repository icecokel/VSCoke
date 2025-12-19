"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const Home = () => {
  const t = useTranslations("home");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-800 text-gray-100">
      {/* Hero Section */}
      <div className="flex items-center justify-center py-10">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-100 mb-6">
            {t("greeting")} <br />
            <span className="text-blue-100">{t("developer")}</span>
            {t("suffix")}
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">{t("welcome")}</p>
        </div>
      </div>

      {/* Entertainment Section */}
      <div className="py-12 px-4 bg-gray-900 rounded-lg">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-left">
            <h2 className="text-3xl font-bold text-white mb-2">{t("entertainment")}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Sky Drop Game Card */}
            <div
              onClick={() => router.push("/game")}
              className="group p-6 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors"
            >
              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-[#4ECDC4] transition-colors">
                Sky Drop
              </h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                같은 색 블록 3개를 모으는 퍼즐 게임.
              </p>

              <div className="flex items-center text-[#4ECDC4] text-sm font-medium">
                <span>{t("playGame")}</span>
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
