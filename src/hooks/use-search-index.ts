"use client";

import { useContext, useMemo } from "react";
import { useTranslations } from "next-intl";
import RESUME_DATA from "@/constants/resume-data.json";
import { SearchPostsContext } from "@/contexts/app-provider";
import type { ResumeCareerData } from "@/components/profile/resume/types";
import type { SearchItem } from "@/types/search";

type ResumeDescription = {
  subtitle?: string;
  detail?: string;
  skills?: string;
  tasks?: string[];
  achievement?: string;
};

const resumeData = RESUME_DATA as ResumeCareerData[];

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const safeTranslate = (
  translator: ((key: string) => string) & { has: (key: string) => boolean },
  key: string,
  fallback: string,
): string => {
  try {
    return translator(key);
  } catch {
    return fallback;
  }
};

const safeRaw = <T>(getter: () => T, fallback: T): T => {
  try {
    return getter();
  } catch {
    return fallback;
  }
};

const collectDescriptionTexts = (description: unknown): string[] => {
  if (!description || typeof description !== "object") {
    return [];
  }

  const value = description as ResumeDescription;
  const tasks = Array.isArray(value.tasks) ? value.tasks.filter(isNonEmptyString) : [];

  return [value.subtitle, value.detail, value.skills, value.achievement, ...tasks].filter(
    isNonEmptyString,
  );
};

const uniqueStrings = (values: string[]): string[] => {
  const set = new Set(values.filter(isNonEmptyString).map(value => value.trim()));
  return [...set];
};

export const useSearchIndex = (): SearchItem[] => {
  const posts = useContext(SearchPostsContext);
  const tBlog = useTranslations("blog");
  const tProfile = useTranslations("profile");
  const tResume = useTranslations("resume");
  const tGame = useTranslations("Game");
  const tDoom = useTranslations("Doom");

  return useMemo(() => {
    const blogLanding: SearchItem = {
      id: "blog:index",
      type: "blog",
      title: tBlog("title"),
      description: tBlog("description"),
      keywords: ["blog", "posts", "dashboard"],
      path: "/blog",
      featured: true,
      priority: 420,
    };

    const blogDashboard: SearchItem = {
      id: "blog:dashboard",
      type: "blog",
      title: tBlog("dashboardTitle"),
      description: tBlog("dashboardDescription"),
      keywords: [tBlog("title"), "dashboard"],
      path: "/blog/dashboard",
      featured: true,
      priority: 360,
    };

    const blogPosts: SearchItem[] = posts.map(post => ({
      id: `blog:post:${post.slug}`,
      type: "blog",
      title: post.title,
      description: post.description,
      keywords: uniqueStrings([post.category, ...post.tags]),
      path: `/blog/${post.slug}`,
      priority: 180,
    }));

    const introLines = safeRaw(() => tResume.raw("introduction"), []);
    const introduction = Array.isArray(introLines) ? introLines.filter(isNonEmptyString) : [];

    const profileLanding: SearchItem = {
      id: "profile:readme",
      type: "profile",
      title: "README.md",
      description: [tProfile("developerName"), introduction[0] ?? ""].filter(Boolean).join(" "),
      keywords: uniqueStrings([tProfile("introduction"), tProfile("education"), tProfile("links")]),
      path: "/readme",
      featured: true,
      priority: 450,
    };

    const profileProjects: SearchItem[] = resumeData.flatMap(career => {
      const companyKey = `careers.${career.id}.company`;
      const employmentTypeKey = `careers.${career.id}.employmentType`;
      const company = safeTranslate(tResume, companyKey, career.id);
      const employmentType = safeTranslate(tResume, employmentTypeKey, "");

      return career.projects.map(project => {
        const projectKey = `careers.${career.id}.projects.${project.id}`;
        const title = safeTranslate(tResume, `${projectKey}.title`, project.id);
        const period = tResume.has(`${projectKey}.period`)
          ? safeTranslate(tResume, `${projectKey}.period`, "")
          : "";

        const descriptionTexts: string[] = [];
        if (project.descriptions?.length) {
          for (const descriptionRef of project.descriptions) {
            const rawDescription = safeRaw(
              () => tResume.raw(`${projectKey}.descriptions.${descriptionRef.id}`),
              null,
            );
            descriptionTexts.push(...collectDescriptionTexts(rawDescription));
          }
        } else {
          const rawDescriptions = safeRaw(() => tResume.raw(`${projectKey}.descriptions`), []);
          if (Array.isArray(rawDescriptions)) {
            for (const rawDescription of rawDescriptions) {
              descriptionTexts.push(...collectDescriptionTexts(rawDescription));
            }
          }
        }

        const linkedDescription = project.descriptions?.find(
          description => description.fileRef,
        )?.fileRef;
        const path = project.fileRef
          ? `/resume/${project.fileRef}`
          : linkedDescription
            ? `/resume/${linkedDescription}`
            : "/readme";

        return {
          id: `profile:project:${career.id}:${project.id}`,
          type: "profile",
          title: `${company} · ${title}`,
          description: [period, descriptionTexts[0] ?? ""].filter(Boolean).join(" | "),
          keywords: uniqueStrings([company, employmentType, title, period, ...descriptionTexts]),
          path,
          priority: 240,
        } satisfies SearchItem;
      });
    });

    const gameItems: SearchItem[] = [
      {
        id: "game:index",
        type: "game",
        title: "Game Center",
        description: tGame("viewOtherGames"),
        keywords: ["game", "dashboard", "play"],
        path: "/game",
        featured: true,
        priority: 410,
      },
      {
        id: "game:sky-drop",
        type: "game",
        title: "Sky Drop",
        description: tGame("skyDropDesc"),
        keywords: ["sky drop", "puzzle"],
        path: "/game/sky-drop",
        featured: true,
        priority: 400,
      },
      {
        id: "game:fish-drift",
        type: "game",
        title: "Fish Drift",
        description: tGame("fishDriftDesc"),
        keywords: ["fish drift", "runner"],
        path: "/game/fish-drift",
        featured: true,
        priority: 395,
      },
      {
        id: "game:wordle",
        type: "game",
        title: tGame("wordleTitle"),
        description: tGame("wordleDesc"),
        keywords: ["wordle", "word", "puzzle"],
        path: "/game/wordle",
        featured: true,
        priority: 390,
      },
      {
        id: "game:doom",
        type: "game",
        title: tGame("doomTitle"),
        description: `${tGame("doomDesc")} ${tDoom("subtitle")}`,
        keywords: uniqueStrings([tDoom("title"), tDoom("controls"), "doom", "fps"]),
        path: "/doom",
        priority: 380,
      },
    ];

    return [
      profileLanding,
      blogLanding,
      blogDashboard,
      ...blogPosts,
      ...profileProjects,
      ...gameItems,
    ];
  }, [posts, tBlog, tDoom, tGame, tProfile, tResume]);
};
