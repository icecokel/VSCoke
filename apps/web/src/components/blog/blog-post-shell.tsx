import type { ReactNode } from "react";
import { ArrowLeft, CalendarDays, Clock3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BLOG_SPEECH_CONTENT_ID } from "@/components/blog/blog-speech";
import { BlogSpeechControls } from "@/components/blog/blog-speech-controls";
import { BlogTableOfContents } from "@/components/blog/blog-table-of-contents";
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

export const BlogPostShell = async ({
  backToListLabel,
  canonicalUrl,
  children,
  locale,
  post,
}: BlogPostShellProps) => {
  const t = await getTranslations({ locale, namespace: "blog.detail" });
  const jsonLd = createBlogPostJsonLd({ canonicalUrl, locale, post });
  const minutes = post.readingTime.match(/^(\d+) min read$/)?.[1];
  const category =
    post.category === "dev"
      ? t("development")
      : post.category === "journal"
        ? t("journal")
        : post.category;

  return (
    <div
      className="@container/blog mx-auto w-full max-w-6xl bg-background px-4 pb-20 text-foreground sm:px-7 md:px-10"
      data-testid="blog-post"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ScrollProgress label={t("progress")} />

      <nav aria-label={backToListLabel} className="pt-6 pb-8 @4xl/blog:pt-8 @4xl/blog:pb-12">
        <CustomLink
          href="/blog"
          title="Blog"
          className="inline-flex min-h-10 items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {backToListLabel}
        </CustomLink>
      </nav>

      <header id="blog-post-top" className="max-w-3xl scroll-mt-6" data-testid="blog-post-header">
        <div className="mb-5 flex items-center gap-3 text-xs font-semibold tracking-widest text-muted-foreground">
          <span aria-hidden="true" className="h-px w-8 bg-primary" />
          <span>{category}</span>
        </div>
        <h1
          id="blog-article-title"
          className="text-3xl leading-snug font-semibold tracking-tight text-balance break-keep [overflow-wrap:anywhere] @2xl/blog:text-4xl @4xl/blog:text-5xl @4xl/blog:leading-tight"
        >
          {post.title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-pretty text-muted-foreground @2xl/blog:text-lg">
          {post.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="size-4" />
            <span className="sr-only">{t("publishedOn")}</span>
            <time dateTime={post.date}>
              {new Intl.DateTimeFormat(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              }).format(new Date(post.date))}
            </time>
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock3 aria-hidden="true" className="size-4" />
            {minutes ? t("readingTime", { minutes: Number(minutes) }) : post.readingTime}
          </span>
        </div>
        {post.tags.length > 0 && (
          <ul aria-label={t("tags")} className="mt-5 flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <li
                key={tag}
                className="max-w-full rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs leading-5 break-words text-muted-foreground"
              >
                <span aria-hidden="true" className="mr-1 text-muted-foreground/70">
                  #
                </span>
                {tag}
              </li>
            ))}
          </ul>
        )}
      </header>

      <div
        role="group"
        aria-label={t("tools")}
        className="mt-8 mb-9 flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-3 border-y border-border py-3 @4xl/blog:mt-10 @4xl/blog:mb-12"
        data-testid="blog-reading-tools"
      >
        {/* 글 원문은 모든 UI locale에서 한국어이므로 낭독 언어는 원문을 따른다. */}
        <BlogSpeechControls title={post.title} description={post.description} language="ko-KR" />
        <div className="flex flex-wrap items-center gap-2">
          <ShareLinkButton
            url={canonicalUrl}
            title={post.title}
            text={post.description}
            className="min-h-10"
          />
          <ShareQrDialog url={canonicalUrl} title={post.title} triggerClassName="min-h-10" />
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-8 @4xl/blog:grid-cols-[minmax(0,1fr)_13rem] @4xl/blog:gap-12">
        <div className="order-2 min-w-0 @4xl/blog:order-1">
          <article
            id={BLOG_SPEECH_CONTENT_ID}
            lang="ko"
            aria-labelledby="blog-article-title"
            className="min-w-0 max-w-3xl text-base leading-8 [overflow-wrap:anywhere] [&>:first-child]:mt-0"
          >
            {children}
          </article>
          <footer className="mt-16 flex items-center justify-between gap-4 border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">{t("endOfArticle")}</p>
            <a
              href="#blog-post-top"
              className="inline-flex min-h-10 items-center rounded-md px-2 text-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("backToTop")}
            </a>
          </footer>
        </div>
        <BlogTableOfContents key={post.slug} />
      </div>
    </div>
  );
};
