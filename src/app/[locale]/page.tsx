"use client";

import { useCustomRouter } from "@/hooks/use-custom-router";
import { useTranslations } from "next-intl";

const Home = () => {
  const t = useTranslations("home");
  const router = useCustomRouter();

  const quickLaunchCards = [
    {
      id: "readme",
      title: t("cards.readmeTitle"),
      description: t("cards.readmeDesc"),
      path: "/readme",
    },
    {
      id: "blog",
      title: t("cards.blogTitle"),
      description: t("cards.blogDesc"),
      path: "/blog",
    },
    {
      id: "blog-dashboard",
      title: t("cards.blogDashboardTitle"),
      description: t("cards.blogDashboardDesc"),
      path: "/blog/dashboard",
    },
    {
      id: "game",
      title: t("cards.gameTitle"),
      description: t("cards.gameDesc"),
      path: "/game",
    },
  ];

  return (
    <div className="min-h-full bg-gray-800 text-gray-100">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 md:space-y-10 md:px-6 md:py-10">
        <section className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-6 md:p-10">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs uppercase tracking-[0.22em] text-blue-200/80">VSCOKE HUB</p>
            <h1 className="text-3xl font-bold text-gray-100 md:text-5xl">
              {t("greeting")} <br />
              <span className="text-blue-100">{t("developer")}</span>
              {t("suffix")}
            </h1>
            <p className="mt-4 text-base text-gray-300 md:text-lg">{t("headline")}</p>
            <p className="mt-2 text-sm text-gray-400 md:text-base">{t("subheadline")}</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/readme")}
              className="rounded-lg border border-blue-300 bg-blue-300 px-5 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-blue-200"
            >
              {t("primaryCta")}
            </button>
            <button
              type="button"
              onClick={() => router.push("/game")}
              className="rounded-lg border border-gray-500 px-5 py-2 text-sm font-semibold text-gray-100 transition-colors hover:border-gray-300 hover:bg-gray-700"
            >
              {t("secondaryCta")}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5 md:p-7">
          <div className="mb-5 md:mb-6">
            <h2 className="text-2xl font-bold text-white md:text-3xl">{t("quickLaunchTitle")}</h2>
            <p className="mt-2 text-sm text-gray-400 md:text-base">{t("quickLaunchDescription")}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickLaunchCards.map(card => (
              <button
                key={card.id}
                type="button"
                onClick={() => router.push(card.path)}
                className="group rounded-xl border border-gray-700 bg-gray-800 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:bg-gray-750"
              >
                <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-gray-400">{card.description}</p>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-200 transition-colors group-hover:text-blue-100">
                  <span>{t("cards.open")}</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
