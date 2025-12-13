"use client";

import type { PostMeta } from "@/types/blog";
import PostCard from "./post-card";
import { useTranslations } from "next-intl";
import Icon from "@/components/base-ui/icon";

interface PostListProps {
  posts: PostMeta[];
}

const PostList = ({ posts }: PostListProps) => {
  const t = useTranslations("blog");

  if (posts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Icon kind="article" size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg">{t("noPosts")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {posts.map(post => (
        <PostCard key={post.slug} post={post} />
      ))}
    </div>
  );
};

export default PostList;
