import { getAllPosts } from "@/lib/blog";
import { getResumeDetails } from "@/services/resume-service";
import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getEspressoBeans } from "@/services/espresso-history-service";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllPosts();
  const [resumeDetails, espressoBeans] = await Promise.all([
    getResumeDetails(),
    getEspressoBeans().catch(() => []),
  ]);

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
