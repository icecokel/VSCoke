import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import type { Post, PostMeta, CategoryGroup } from "@/types/blog";

const DEFAULT_CATEGORY = "uncategorized";

const postsDirectory = path.join(process.cwd(), "src/posts");

export const getPostSlugs = (): string[] => {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }
  const files = fs.readdirSync(postsDirectory);
  return files.filter(file => file.endsWith(".mdx")).map(file => file.replace(/\.mdx$/, ""));
};

export const getPostBySlug = (slug: string): Post | null => {
  const filePath = path.join(postsDirectory, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);
  const stats = readingTime(content);

  return {
    slug,
    title: data.title || "",
    date: data.date || "",
    description: data.description || "",
    tags: data.tags || [],
    category: data.category || DEFAULT_CATEGORY,
    readingTime: stats.text,
    published: data.published !== false, // 기본값 true, 명시적으로 false일 때만 비공개
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
