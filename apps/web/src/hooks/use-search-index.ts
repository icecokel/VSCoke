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

export const useSearchIndex = (): SearchItem[] => {
  const isJevEnabled = useBeatJevAvailability();
  const locale = useLocale();
  const selection = useSearchParams().getAll("resume");
  const resumeKey = getResumeKey(selection.length > 1 ? selection : selection[0]);
  const posts = useContext(SearchPostsContext);
  const tBlog = useTranslations("blog");
  const tProfile = useTranslations("profile");
  const tResumeRag = useTranslations("resumeRag");
  const tGame = useTranslations("Game");
  const tHobbyRecipes = useTranslations("hobby.recipes");
  const tHobbyEspresso = useTranslations("hobby.espresso");
  const [hobbyItems, setHobbyItems] = useState<SearchItem[]>([]);
  const [resumeItems, setResumeItems] = useState<{
    locale: string;
    key: string;
    items: SearchItem[];
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch(`/api/hobby-search-index?locale=${encodeURIComponent(locale)}`, { cache: "no-store" })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Search index request failed: ${response.status}`);
        }

        return response.json() as Promise<{ data?: SearchItem[] }>;
      })
      .then(({ data }) => {
        if (isMounted) {
          setHobbyItems(data ?? []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHobbyItems([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [locale]);

  useEffect(() => {
    let isMounted = true;

    fetch(`/api/resume-search-index?${new URLSearchParams({ locale, resume: resumeKey })}`, {
      cache: "no-store",
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Resume search index request failed: ${response.status}`);
        }
        return response.json() as Promise<{ data: SearchItem[] }>;
      })
      .then(({ data }) => {
        if (isMounted) setResumeItems({ locale, key: resumeKey, items: data });
      })
      .catch(() => {
        if (isMounted) setResumeItems(null);
      });

    return () => {
      isMounted = false;
    };
  }, [locale, resumeKey]);

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
      ...(resumeItems?.locale === locale && resumeItems.key === resumeKey
        ? resumeItems.items
        : [profileLanding]),
      resumeQuestion,
      blogLanding,
      blogDashboard,
      hobbyRecipeLanding,
      hobbyEspressoLanding,
      ...blogPosts,
      ...gameItems.filter(item => item.id !== "game:beat-jev" || isJevEnabled === true),
      ...hobbyItems,
    ];
  }, [
    isJevEnabled,
    locale,
    resumeKey,
    resumeItems,
    hobbyItems,
    posts,
    tBlog,
    tGame,
    tHobbyEspresso,
    tHobbyRecipes,
    tProfile,
    tResumeRag,
  ]);
};
