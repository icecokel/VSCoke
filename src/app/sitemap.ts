import { getAllPosts } from "@/lib/blog";
import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://vscoke.vercel.app";
  const posts = getAllPosts();

  const staticRoutes = ["", "/blog", "/game", "/readme", "/package"];
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

  return [...localizedStaticUrls, ...localizedPostUrls];
}
