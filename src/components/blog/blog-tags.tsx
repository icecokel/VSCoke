"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Chip from "@/components/base-ui/chip";
import type { TagSummary } from "@/types/blog";

interface BlogTagsProps {
  tags: TagSummary[];
  limit?: number;
}

const BlogTags = ({ tags, limit = 15 }: BlogTagsProps) => {
  const t = useTranslations("blog");
  const [expanded, setExpanded] = useState(false);

  const hasMore = tags.length > limit;
  const visibleTags = expanded ? tags : tags.slice(0, limit);
  const hiddenCount = Math.max(tags.length - limit, 0);

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        {visibleTags.map(tag => (
          <Chip key={tag.label} label={`${tag.label} (${tag.count})`} />
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          className="mt-3 text-sm text-gray-300 hover:text-yellow-200 transition-colors"
          onClick={() => setExpanded(prev => !prev)}
        >
          {expanded
            ? t("hideAllTags")
            : t("showAllTags", {
                count: hiddenCount,
              })}
        </button>
      )}
    </div>
  );
};

export default BlogTags;
