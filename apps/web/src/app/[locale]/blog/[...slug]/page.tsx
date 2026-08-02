import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BlogPostShell } from "@/components/blog/blog-post-shell";
import { siteUrl } from "@/lib/site-url";

interface BlogPostPageProps {
  params: Promise<{
    locale: string;
    slug: string[];
  }>;
}

export const generateStaticParams = async () => {
  const posts = getAllPosts();
  return posts.map(post => ({ slug: post.slug.split("/") }));
};

export const generateMetadata = async ({ params }: BlogPostPageProps): Promise<Metadata> => {
  const { slug, locale } = await params;
  const slugPath = slug.join("/");
  const post = getPostBySlug(slugPath);

  if (!post || !post.published) {
    return { title: "Post Not Found" };
  }

  const url = `${siteUrl}/${locale}/blog/${slugPath}`;

  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url,
      publishedTime: post.date,
      authors: ["icecokel"],
      tags: post.tags,
      images: [
        {
          url: `${siteUrl}/og.png`, // Default OG Image
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [`${siteUrl}/og.png`],
    },
  };
};

const BlogPostPage = async ({ params }: BlogPostPageProps) => {
  const { slug, locale } = await params;
  const slugPath = slug.join("/");
  const post = getPostBySlug(slugPath);
  const t = await getTranslations("blog");

  if (!post || !post.published) {
    notFound();
  }

  const { default: PostContent } = await post.load();

  return (
    <BlogPostShell
      post={post}
      locale={locale}
      canonicalUrl={`${siteUrl}/${locale}/blog/${slugPath}`}
      backToListLabel={t("backToList")}
    >
      <PostContent />
    </BlogPostShell>
  );
};

export default BlogPostPage;
