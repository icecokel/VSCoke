"use client";

import BaseText from "@/components/base-ui/text";
import Chip from "@/components/base-ui/chip";
import Icon from "@/components/base-ui/icon";
import { CustomLink } from "@/components/custom-link";
import type { PostMeta } from "@/types/blog";

interface PostCardProps {
  post: PostMeta;
}

const PostCard = ({ post }: PostCardProps) => {
  return (
    <CustomLink href={`/blog/${post.slug}`} title={post.title}>
      <article className="bg-gray-800/50 rounded-lg p-5 hover:bg-gray-700/50 transition-colors border border-gray-700/50 hover:border-yellow-200/30">
        <BaseText type="h5" className="text-yellow-200 mb-2 line-clamp-2">
          {post.title}
        </BaseText>
        <BaseText type="body2" className="text-gray-300 mb-3 line-clamp-2">
          {post.description}
        </BaseText>
        <div className="flex flex-wrap gap-1 mb-3">
          {post.tags.map(tag => (
            <Chip key={tag} label={tag} />
          ))}
        </div>
        <div className="flex items-center gap-4 text-gray-400 text-sm">
          <span className="flex items-center gap-1">
            <Icon kind="calendar_today" size={14} />
            {post.date}
          </span>
          <span className="flex items-center gap-1">
            <Icon kind="schedule" size={14} />
            {post.readingTime}
          </span>
        </div>
      </article>
    </CustomLink>
  );
};

export default PostCard;
