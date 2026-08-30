import { getAllPosts } from "@/lib/blog";
import { getAllResumeDetails } from "@/lib/resume-detail";
import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getEspressoBeans } from "@/services/espresso-history-service";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    "/game/wordle",
  ];
  const localizedStaticUrls = routing.locales.flatMap(locale =>
    staticRoutes.map(route => ({
      url: `${siteUrl}/${locale}${route}`,
      lastModified: new Date(),
    })),
  );

  const localizedPostUrls = routing.locales.flatMap(locale =>
    posts.map(post => ({
      url: `${siteUrl}/${locale}/blog/${post.slug}`,
      lastModified: new Date(post.date),
    })),
  );

  const localizedResumeUrls = routing.locales.flatMap(locale =>
    resumeDetails.map(detail => ({
      url: `${siteUrl}/${locale}/resume/${detail.slug}`,
      lastModified: new Date(),
    })),
  );

  const localizedEspressoUrls = routing.locales.flatMap(locale =>
    espressoBeans.map(bean => ({
      url: `${siteUrl}/${locale}/hobby/espresso/${bean.id}`,
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
