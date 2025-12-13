"use client";

import type { PostMeta } from "@/types/blog";
import PostCard from "./post-card";

interface PostListProps {
  posts: PostMeta[];
}

const PostList = ({ posts }: PostListProps) => {
  if (posts.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <p>포스트가 없습니다.</p>
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
