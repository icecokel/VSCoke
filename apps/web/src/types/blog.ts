import type { ComponentType } from "react";

export interface PostMeta {
  title: string;
  date: string;
  description: string;
  tags: string[];
  category: string;
  slug: string;
  readingTime: string;
  published: boolean;
}

export interface BlogPostModule {
  default: ComponentType;
}

export interface BlogPostDefinition extends PostMeta {
  load: () => Promise<BlogPostModule>;
}

export interface CategoryGroup {
  category: string;
  posts: PostMeta[];
}

export interface TagSummary {
  label: string;
  count: number;
}
