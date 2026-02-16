"use client";

import { useCustomRouter } from "@/hooks/use-custom-router";
import RESUME_DATA from "@/constants/resume-data.json";
import { SearchPostsContext } from "@/contexts/app-provider";
import { useTranslations } from "next-intl";
import { useContext } from "react";

interface ResumeCareer {
  projects: unknown[];
}

const TOTAL_PROJECTS = (RESUME_DATA as ResumeCareer[]).reduce(
  (count, career) => count + career.projects.length,
  0,
);
const AVAILABLE_GAME_COUNT = 4;
const TECH_STACKS = ["Next.js", "TypeScript", "Tailwind CSS", "Phaser 3", "Node.js"];

const Home = () => {
  const t = useTranslations("home");
  const tResume = useTranslations("resume");
  const router = useCustomRouter();
  const posts = useContext(SearchPostsContext);

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

  const trustCards = [
    {
      id: "experience",
      label: t("trust.experience"),
      value: tResume("totalExperience"),
      hint: t("trust.experienceHint"),
    },
    {
      id: "projects",
      label: t("trust.projects"),
      value: `${TOTAL_PROJECTS}${t("trust.projectSuffix")}`,
      hint: t("trust.projectsHint"),
    },
    {
      id: "posts",
      label: t("trust.posts"),
      value: `${posts.length}${t("trust.postSuffix")}`,
      hint: t("trust.postsHint"),
    },
    {
      id: "games",
      label: t("trust.games"),
      value: `${AVAILABLE_GAME_COUNT}${t("trust.gameSuffix")}`,
      hint: t("trust.gamesHint"),
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

        <section className="rounded-2xl border border-gray-700 bg-gray-900/60 p-5 md:p-7">
          <div className="mb-5 md:mb-6">
            <h2 className="text-2xl font-bold text-white md:text-3xl">{t("trustTitle")}</h2>
            <p className="mt-2 text-sm text-gray-400 md:text-base">{t("trustDescription")}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {trustCards.map(item => (
              <div key={item.id} className="rounded-xl border border-gray-700 bg-gray-800/80 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">{item.label}</p>
                <p className="mt-2 text-xl font-bold text-blue-100 md:text-2xl">{item.value}</p>
                <p className="mt-1 text-xs text-gray-500">{item.hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
              {t("techTitle")}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {TECH_STACKS.map(tech => (
                <span
                  key={tech}
                  className="rounded-full border border-gray-600 bg-gray-800 px-3 py-1 text-xs text-gray-200"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
