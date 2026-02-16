import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import type { Post, PostMeta, CategoryGroup, TagSummary } from "@/types/blog";

const postsDirectory = path.join(process.cwd(), "src/posts");

interface PostSlugInfo {
  slug: string;
  category: string;
  filePath: string;
}

/**
 * 재귀적으로 posts 디렉토리를 탐색하여 모든 MDX 파일 정보를 반환
 */
const getPostFiles = (dir: string = postsDirectory, category: string = ""): PostSlugInfo[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const posts: PostSlugInfo[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // 하위 폴더 탐색 - 폴더명이 카테고리
      posts.push(...getPostFiles(fullPath, entry.name));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      const slug = entry.name.replace(/\.mdx$/, "");
      posts.push({
        slug: category ? `${category}/${slug}` : slug,
        category: category || "uncategorized",
        filePath: fullPath,
      });
    }
  }

  return posts;
};

const getPostSlugs = (): string[] => {
  return getPostFiles().map(post => post.slug);
};

export const getPostBySlug = (slug: string): Post | null => {
  const posts = getPostFiles();
  const postInfo = posts.find(p => p.slug === slug);

  if (!postInfo) {
    return null;
  }

  const fileContents = fs.readFileSync(postInfo.filePath, "utf8");
  const { data, content } = matter(fileContents);
  const stats = readingTime(content);

  return {
    slug,
    title: data.title || "",
    date: data.date || "",
    description: data.description || "",
    tags: data.tags || [],
    category: postInfo.category, // 폴더명에서 카테고리 추출
    readingTime: stats.text,
    published: data.published !== false,
    content,
  };
};

export const getAllPosts = (includeUnpublished = false): PostMeta[] => {
  const slugs = getPostSlugs();
  const posts = slugs
    .map(slug => {
      const post = getPostBySlug(slug);
      if (!post) return null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { content, ...meta } = post;
      return meta;
    })
    .filter((post): post is PostMeta => post !== null)
    .filter(post => includeUnpublished || post.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
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
