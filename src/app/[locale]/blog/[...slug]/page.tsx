import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import BaseText from "@/components/base-ui/text";
import Chip from "@/components/base-ui/chip";
import Icon from "@/components/base-ui/icon";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

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

  const url = `https://vscoke.vercel.app/${locale}/blog/${slugPath}`;

  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
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
          url: "https://vscoke.vercel.app/og.png", // Default OG Image
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
      images: ["https://vscoke.vercel.app/og.png"],
    },
  };
};

// MDX Components are imported from @/components/blog/mdx-components
import { mdxComponents } from "@/components/blog/mdx-components";

const BlogPostPage = async ({ params }: BlogPostPageProps) => {
  const { locale, slug } = await params;
  const slugPath = slug.join("/");
  const post = getPostBySlug(slugPath);
  const t = await getTranslations("blog");

  if (!post || !post.published) {
    notFound();
  }

  return (
    <div className="p-3 md:p-5 max-w-4xl mx-auto">
      <Link
        href={`/${locale}/blog`}
        className="inline-flex items-center gap-1 text-gray-400 hover:text-yellow-200 mb-6"
      >
        <Icon kind="arrow_back" size={18} />
        <span>{t("backToList")}</span>
      </Link>

      <header className="mb-8 pb-6 border-b border-gray-700">
        <BaseText type="h2" className="text-yellow-200 mb-4">
          {post.title}
        </BaseText>
        <BaseText type="body1" className="text-gray-300 mb-4">
          {post.description}
        </BaseText>
        <div className="flex flex-wrap gap-2 mb-4">
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
      </header>

      <article className="prose prose-invert max-w-none">
        <MDXRemote source={post.content} components={mdxComponents} />
      </article>
    </div>
  );
};

export default BlogPostPage;
