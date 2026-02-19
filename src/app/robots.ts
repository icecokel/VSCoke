import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://vscoke.vercel.app";

  const localizedDisallow = routing.locales.flatMap(locale => [
    `/${locale}/share/`,
    `/${locale}/blog/dashboard`,
  ]);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...localizedDisallow],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
