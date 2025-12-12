"use client";

import { useTranslations } from "next-intl";

const Home = () => {
  const t = useTranslations("home");

  return (
    <div className="min-h-screen bg-gray-800 text-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-100 mb-6">
          {t("greeting")} <br />
          <span className="text-blue-100">{t("developer")}</span>
          {t("suffix")}
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">{t("welcome")}</p>
      </div>
    </div>
  );
};

export default Home;
