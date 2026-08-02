import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
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
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
