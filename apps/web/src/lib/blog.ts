import type { BlogPostDefinition, CategoryGroup, PostMeta, TagSummary } from "@/types/blog";
import { getBlogPostDefinition, getRegisteredPostMetas } from "@/posts/blog-post-registry";

export const getPostBySlug = (slug: string): BlogPostDefinition | null => {
  return getBlogPostDefinition(slug);
};

export const getAllPosts = (includeUnpublished = false): PostMeta[] => {
  return getRegisteredPostMetas()
    .filter(post => includeUnpublished || post.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const TAG_LABEL_ALIASES: Record<string, string> = {
  nextjs: "Next.js",
  gamedev: "Game Dev",
  devlog: "Dev Log",
  opengraph: "OpenGraph",
  webapi: "Web API",
  nodejs: "Node.js",
  termux: "Termux",
  window: "Window",
  document: "Document",
  android: "Android",
  debugging: "Debugging",
};

const normalizeTagKey = (tag: string): string => {
  return tag
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9가-힣]+/g, "");
};

export const getAllTags = (): TagSummary[] => {
  const allPosts = getAllPosts();
  const tagMap = new Map<string, TagSummary>();

  allPosts.forEach(post => {
    post.tags.forEach(tag => {
      const rawTag = String(tag).trim();
      if (!rawTag) return;

      const key = normalizeTagKey(rawTag);
      if (!key) return;

      const normalizedLabel = TAG_LABEL_ALIASES[key] ?? rawTag;
      const existing = tagMap.get(key);
      if (existing) {
        existing.count += 1;
        return;
      }

      tagMap.set(key, { label: normalizedLabel, count: 1 });
    });
  });

  return Array.from(tagMap.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.label.localeCompare(b.label, "ko-KR", { sensitivity: "base" });
  });
};

export const getPostsGroupedByCategory = (): CategoryGroup[] => {
  const allPosts = getAllPosts();
  const categoryMap = new Map<string, PostMeta[]>();

  allPosts.forEach(post => {
    const existing = categoryMap.get(post.category) || [];
    categoryMap.set(post.category, [...existing, post]);
  });

  return Array.from(categoryMap.entries())
    .map(([category, posts]) => ({ category, posts }))
    .sort((a, b) => {
      // 각 카테고리의 최신 포스트 날짜를 비교하여 내림차순 정렬
      const dateA = a.posts[0]?.date ? new Date(a.posts[0].date).getTime() : 0;
      const dateB = b.posts[0]?.date ? new Date(b.posts[0].date).getTime() : 0;
      return dateB - dateA;
    });
};
