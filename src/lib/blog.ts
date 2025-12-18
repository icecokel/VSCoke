import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import type { Post, PostMeta, CategoryGroup } from "@/types/blog";

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

export const getPostSlugs = (): string[] => {
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

export const getPostsByTag = (tag: string): PostMeta[] => {
  const allPosts = getAllPosts();
  return allPosts.filter(post => post.tags.includes(tag));
};

export const getAllTags = (): string[] => {
  const allPosts = getAllPosts();
  const tagSet = new Set<string>();
  allPosts.forEach(post => {
    post.tags.forEach(tag => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
};

export const getAllCategories = (): string[] => {
  const allPosts = getAllPosts();
  const categorySet = new Set<string>();
  allPosts.forEach(post => {
    categorySet.add(post.category);
  });
  return Array.from(categorySet).sort();
};

export const getPostsByCategory = (category: string): PostMeta[] => {
  const allPosts = getAllPosts();
  return allPosts.filter(post => post.category === category);
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
    .sort((a, b) => a.category.localeCompare(b.category));
};
