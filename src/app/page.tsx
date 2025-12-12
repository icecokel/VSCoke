"use client";

import { useTranslation } from "react-i18next";

const Home = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-800 text-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-100 mb-6">
          {t("home.greeting")} <br />
          <span className="text-blue-100">{t("home.developer")}</span>
          {t("home.suffix")}
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">{t("home.welcome")}</p>
      </div>
    </div>
  );
};

export default Home;
