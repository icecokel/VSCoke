import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BlogPostShell } from "@/components/blog/blog-post-shell";
import { getPostBySlug } from "@/lib/blog";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

interface BlogDraftPreviewPageProps {
  params: Promise<{ locale: string; slug: string[] }>;
}

export const generateMetadata = async ({
  params,
}: BlogDraftPreviewPageProps): Promise<Metadata> => {
  if (process.env.NODE_ENV !== "development") return { robots: { index: false, follow: false } };
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog.benchmark" });
  return { title: t("previewTitle"), robots: { index: false, follow: false } };
};

const BlogDraftPreviewPage = async ({ params }: BlogDraftPreviewPageProps) => {
  // 초안 열람을 위한 별도 경로다. 기존 공개 라우트의 published 검사를 완화하지 않는다.
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale, slug } = await params;
  const post = getPostBySlug(slug.join("/"));
  if (!post || post.published) notFound();
  const t = await getTranslations({ locale, namespace: "blog" });
  const { default: PostContent } = await post.load();

  return (
    <>
      <aside
        className="mx-auto mt-4 w-full max-w-6xl px-4 sm:px-7 md:px-10"
        data-testid="blog-draft-notice"
      >
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 text-foreground">
          <p className="text-sm font-semibold">{t("benchmark.previewTitle")}</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            {t("benchmark.previewNote")}
          </p>
        </div>
      </aside>
      <BlogPostShell
        post={post}
        locale={locale}
        canonicalUrl={`${siteUrl}/${locale}/blog/${post.slug}`}
        backToListLabel={t("backToList")}
      >
        <PostContent />
      </BlogPostShell>
    </>
  );
};

export default BlogDraftPreviewPage;
