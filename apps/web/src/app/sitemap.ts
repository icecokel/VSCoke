import { getAllPosts } from "@/lib/blog";
import { getAllResumeDetails } from "@/lib/resume-detail";
import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getEspressoBeans } from "@/services/espresso-history-service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://vscoke.vercel.app";
  const posts = getAllPosts();
  const resumeDetails = getAllResumeDetails();
  const espressoBeans = await getEspressoBeans().catch(() => []);

  const staticRoutes = [
    "",
    "/blog",
    "/hobby/espresso",
    "/hobby/recipes",
    "/readme",
    "/game",
    "/game/sky-drop",
    "/game/fish-drift",
    "/game/poke-lounge",
    "/game/wordle",
    "/doom",
  ];
  const localizedStaticUrls = routing.locales.flatMap(locale =>
    staticRoutes.map(route => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date(),
    })),
  );

  const localizedPostUrls = routing.locales.flatMap(locale =>
    posts.map(post => ({
      url: `${baseUrl}/${locale}/blog/${post.slug}`,
      lastModified: new Date(post.date),
    })),
  );

  const localizedResumeUrls = routing.locales.flatMap(locale =>
    resumeDetails.map(detail => ({
      url: `${baseUrl}/${locale}/resume/${detail.slug}`,
      lastModified: new Date(),
    })),
  );

  const localizedEspressoUrls = routing.locales.flatMap(locale =>
    espressoBeans.map(bean => ({
      url: `${baseUrl}/${locale}/hobby/espresso/${bean.id}`,
      lastModified: new Date(),
    })),
  );

  return [
    ...localizedStaticUrls,
    ...localizedPostUrls,
    ...localizedResumeUrls,
    ...localizedEspressoUrls,
  ];
}
