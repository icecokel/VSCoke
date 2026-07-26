import type { ReactNode } from "react";
import BaseText from "@/components/base-ui/text";
import Chip from "@/components/base-ui/chip";
import Icon from "@/components/base-ui/icon";
import ScrollProgress from "@/components/blog/scroll-progress";
import { CustomLink } from "@/components/custom-link";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { ShareQrDialog } from "@/components/share/share-qr-dialog";
import { createBlogPostJsonLd, serializeJsonLd } from "@/lib/blog-json-ld";
import type { PostMeta } from "@/types/blog";

interface BlogPostShellProps {
  backToListLabel: string;
  canonicalUrl: string;
  children: ReactNode;
  locale: string;
  post: PostMeta;
}

export const BlogPostShell = ({
  backToListLabel,
  canonicalUrl,
  children,
  locale,
  post,
}: BlogPostShellProps) => {
  const jsonLd = createBlogPostJsonLd({ canonicalUrl, locale, post });

  return (
    <div className="mx-auto max-w-4xl p-3 md:p-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ScrollProgress />
      <CustomLink
        href="/blog"
        title="Blog"
        className="mb-6 inline-flex items-center gap-1 text-gray-400 hover:text-yellow-200"
      >
        <Icon kind="arrow_back" size={18} />
        <BaseText type="body2">{backToListLabel}</BaseText>
      </CustomLink>

      <div className="mb-6 flex justify-end gap-2">
        <ShareLinkButton title={post.title} text={post.description} />
        <ShareQrDialog title={post.title} />
      </div>

      <header className="mb-8 border-b border-gray-700 pb-6">
        <BaseText type="h2" className="mb-4 text-yellow-200">
          {post.title}
        </BaseText>
        <BaseText type="body1" className="mb-4 text-gray-300">
          {post.description}
        </BaseText>
        <div className="mb-4 flex flex-wrap gap-2 pt-4">
          {post.tags.map(tag => (
            <Chip key={tag} label={tag} />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <Icon kind="calendar_today" size={14} />
            {post.date}
          </span>
          <span className="flex items-center gap-1">
            <Icon kind="schedule" size={14} />
            {post.readingTime}
          </span>
        </div>
      </header>

      <article className="prose prose-invert max-w-none pb-20">{children}</article>
    </div>
  );
};
