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

export interface Post extends PostMeta {
  content: string;
}

export interface CategoryGroup {
  category: string;
  posts: PostMeta[];
}
