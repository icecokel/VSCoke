import { getAllPosts } from "@/lib/blog";
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://vscoke.vercel.app";
  const posts = getAllPosts();

  const postUrls = posts.map(post => ({
    url: `${baseUrl}/ko/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  const staticRoutes = ["", "/blog", "/game", "/profile", "/readme", "/package"].map(route => ({
    url: `${baseUrl}/ko${route}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...postUrls];
}
