"use client";

import { useSearchParams } from "next/navigation";
import { getResumeKey, resumePath } from "@/features/resume/lib/resume-selection";
import { useContext, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SearchPostsContext } from "@/contexts/app-provider";
import type { SearchItem } from "@/types/search";
import { useBeatJevAvailability } from "./use-beat-jev-availability";

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const uniqueStrings = (values: string[]): string[] => {
  const set = new Set(values.filter(isNonEmptyString).map(value => value.trim()));
  return [...set];
};

type SearchIndexStatus = "loading" | "ready" | "error";

interface RemoteSearchIndex {
  items: SearchItem[];
  status: SearchIndexStatus;
  retry: () => void;
}

interface SearchIndex {
  items: SearchItem[];
  sources: { static: "ready"; hobby: SearchIndexStatus; resume: SearchIndexStatus };
  retry: () => void;
}

const useRemoteSearchIndex = (url: string): RemoteSearchIndex => {
  const [request, setRequest] = useState({ url });
  const [state, setState] = useState<{
    request: typeof request;
    items: SearchItem[];
    status: "ready" | "error";
  } | null>(null);

  if (request.url !== url) {
    setRequest({ url });
  }

  useEffect(() => {
    const controller = new AbortController();

    fetch(request.url, { cache: "no-store", signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);
        return response.json() as Promise<{ data?: SearchItem[] }>;
      })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setState({ request, items: data ?? [], status: "ready" });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ request, items: [], status: "error" });
        }
      });

    return () => controller.abort();
  }, [request]);

  const isCurrent = state?.request === request;
  return {
    items: isCurrent ? state.items : [],
    status: isCurrent ? state.status : "loading",
    retry: () => setRequest({ url }),
  };
};

export const useStaticSearchIndex = (): SearchItem[] => {
  const selection = useSearchParams().getAll("resume");
  const resumeKey = getResumeKey(selection.length > 1 ? selection : selection[0]);
  const posts = useContext(SearchPostsContext);
  const tBlog = useTranslations("blog");
  const tProfile = useTranslations("profile");
  const tResumeRag = useTranslations("resumeRag");
  const tGame = useTranslations("Game");
  const tHobbyRecipes = useTranslations("hobby.recipes");
  const tHobbyEspresso = useTranslations("hobby.espresso");

  const items = useMemo(() => {
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

    const hobbyRecipeLanding: SearchItem = {
      id: "hobby:recipes:index",
      type: "hobby",
      title: tHobbyRecipes("title"),
      description: tHobbyRecipes("searchDescription"),
      keywords: ["hobby", "recipe", "recipes", "cooking", tHobbyRecipes("title")],
      path: "/hobby/recipes",
      featured: true,
      priority: 385,
    };

    const hobbyEspressoLanding: SearchItem = {
      id: "hobby:espresso:index",
      type: "hobby",
      title: tHobbyEspresso("title"),
      description: tHobbyEspresso("searchDescription"),
      keywords: ["hobby", "espresso", "coffee", "bean", tHobbyEspresso("title")],
      path: "/hobby/espresso",
      featured: true,
      priority: 382,
    };

    const profileLanding: SearchItem = {
      id: "profile:readme",
      type: "profile",
      title: "README.md",
      description: tProfile("introduction"),
      keywords: uniqueStrings([tProfile("introduction"), tProfile("education"), tProfile("links")]),
      path: resumePath("/readme", resumeKey),
      featured: true,
      priority: 450,
    };

    const resumeQuestion: SearchItem = {
      id: "profile:resume-question",
      type: "profile",
      title: tResumeRag("title"),
      description: tResumeRag("subtitle"),
      keywords: uniqueStrings([
        "resume",
        "rag",
        "question",
        "chat",
        tResumeRag("title"),
        tResumeRag("subtitle"),
      ]),
      path: resumePath("/resume/question", resumeKey),
      featured: true,
      priority: 445,
    };

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
        id: "game:beat-jev",
        type: "game",
        title: tGame("beatJev.title"),
        description: tGame("beatJev.cardDescription"),
        keywords: ["jev", "board game", "yacht dice", "야추", "보드게임"],
        path: "/game/beat-jev",
        featured: true,
        priority: 380,
      },
    ];

    return [
      profileLanding,
      resumeQuestion,
      blogLanding,
      blogDashboard,
      hobbyRecipeLanding,
      hobbyEspressoLanding,
      ...blogPosts,
      ...gameItems,
    ];
  }, [resumeKey, posts, tBlog, tGame, tHobbyEspresso, tHobbyRecipes, tProfile, tResumeRag]);

  return items;
};

export const useSearchIndex = (): SearchIndex => {
  const staticItems = useStaticSearchIndex();
  const isJevEnabled = useBeatJevAvailability();
  const locale = useLocale();
  const selection = useSearchParams().getAll("resume");
  const resumeKey = getResumeKey(selection.length > 1 ? selection : selection[0]);
  const hobby = useRemoteSearchIndex(
    `/api/hobby-search-index?locale=${encodeURIComponent(locale)}`,
  );
  const resume = useRemoteSearchIndex(
    `/api/resume-search-index?${new URLSearchParams({ locale, resume: resumeKey })}`,
  );
  const items = useMemo(
    () => [
      ...(resume.status === "ready" ? resume.items : []),
      ...staticItems.filter(
        item =>
          (item.id !== "profile:readme" || resume.status !== "ready") &&
          (item.id !== "game:beat-jev" || isJevEnabled === true),
      ),
      ...hobby.items,
    ],
    [staticItems, isJevEnabled, resume.status, resume.items, hobby.items],
  );

  return {
    items,
    sources: { static: "ready", hobby: hobby.status, resume: resume.status },
    retry: () => {
      if (hobby.status === "error") hobby.retry();
      if (resume.status === "error") resume.retry();
    },
  };
};
