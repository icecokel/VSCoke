"use server";

import { ITree } from "@/hooks/use-explorer";
import { compareDesc } from "date-fns";
import fs from "fs";
import matter from "gray-matter";
import { MDXRemoteSerializeResult } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import path from "path";
import { cache } from "react";

// Types
export interface FrontMatter {
  title: string;
  date: string;
  published: "publish" | "unpublish";
  excerpt?: string;
  [key: string]: any;
}

export interface PostData {
  frontMatter: FrontMatter;
  content: MDXRemoteSerializeResult;
}

export interface ISearchResult {
  title: string;
  path: string;
  excerpt?: string;
}

interface IMdxFile {
  content: string;
  frontMatter: FrontMatter;
  filePath: string;
}

// Constants
const POSTS_DIRECTORY = path.join(`${process.cwd()}/src`, "posts");

// Cache post data
const postCache = new Map<string, PostData>();

// Helper functions
const getAllMdxFiles = (dir: string): IMdxFile[] => {
  const files = fs.readdirSync(dir);
  const mdxFiles: IMdxFile[] = [];

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      mdxFiles.push(...getAllMdxFiles(filePath));
    } else if (file.endsWith(".mdx")) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(fileContent);

      mdxFiles.push({
        content,
        frontMatter: {
          title: data.title || "Untitled",
          date: data.date || new Date().toISOString(),
          published: data.published || "unpublish",
          ...data,
        },
        filePath: filePath.replace(POSTS_DIRECTORY, "").replace(/\.mdx$/, ""),
      });
    }
  });

  return mdxFiles;
};

// Main functions
export const getPosts = cache(async (): Promise<ITree> => {
  const today = new Date();
  const posts: ITree[] = [];
  const mdxFiles = getAllMdxFiles(POSTS_DIRECTORY)
    .filter(
      file => file.frontMatter.published === "publish" && new Date(file.frontMatter.date) <= today,
    )
    .sort((a, b) => compareDesc(new Date(a.frontMatter.date), new Date(b.frontMatter.date)));

  mdxFiles.forEach(file => {
    const category = file.filePath.split("/")[1];
    const foundIndex = posts.findIndex(({ label }) => label === category);

    if (foundIndex === -1) {
      posts.push({
        id: category,
        label: category,
        items: [],
      });
    }

    const targetIndex = foundIndex === -1 ? posts.length - 1 : foundIndex;
    posts[targetIndex]?.items?.push({
      id: file.filePath,
      label: file.frontMatter.title,
      path: `./src/${file.filePath}`,
      icon: "blog",
    });
  });

  return { index: 1, id: "blog", label: "blog", items: posts };
});

export const getPost = cache(async (filePath: string): Promise<PostData> => {
  // Check cache first
  if (postCache.has(filePath)) {
    return postCache.get(filePath)!;
  }

  const fullPath = path.join(POSTS_DIRECTORY, `${filePath}.mdx`);
  const fileContent = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(fileContent);
  const mdxSource = await serialize(content);

  const postData: PostData = {
    frontMatter: {
      title: data.title || "Untitled",
      date: data.date || new Date().toISOString(),
      published: data.published || "unpublish",
      ...data,
    },
    content: mdxSource,
  };

  // Cache the result
  postCache.set(filePath, postData);
  return postData;
});

export const searchPosts = (keyword: string): ISearchResult[] => {
  if (!keyword.trim()) return [];

  const searchTerm = keyword.toLowerCase();
  const mdxFiles = getAllMdxFiles(POSTS_DIRECTORY);

  return mdxFiles
    .filter(file => {
      const titleMatch = file.frontMatter.title.toLowerCase().includes(searchTerm);
      const contentMatch = file.content.toLowerCase().includes(searchTerm);
      return (titleMatch || contentMatch) && file.frontMatter.published === "publish";
    })
    .sort((a, b) => compareDesc(new Date(a.frontMatter.date), new Date(b.frontMatter.date)))
    .map(file => ({
      title: file.frontMatter.title,
      path: `./src/${file.filePath}`,
      excerpt: file.content.slice(0, 150) + "...",
    }));
};

export const getPostFilePath = (category: string, slug?: string): string => {
  const fileName = slug ? `${category}/${slug}.mdx` : `${category}.mdx`;
  return path.join(POSTS_DIRECTORY, fileName);
};

export interface IResult {
  title: string;
  path: string;
}
