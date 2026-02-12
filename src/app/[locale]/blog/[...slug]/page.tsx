import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import BaseText from "@/components/base-ui/text";
import Chip from "@/components/base-ui/chip";
import Icon from "@/components/base-ui/icon";
import { CustomLink } from "@/components/custom-link";
import ScrollProgress from "@/components/blog/scroll-progress";
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
  const { slug } = await params;
  const slugPath = slug.join("/");
  const post = getPostBySlug(slugPath);
  const t = await getTranslations("blog");

  if (!post || !post.published) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: ["https://vscoke.vercel.app/og.png"],
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: "icecokel",
      url: "https://vscoke.vercel.app/ko/readme",
    },
  };

  return (
    <div className="p-3 md:p-5 max-w-4xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ScrollProgress />
      <CustomLink
        href="/blog"
        title="Blog"
        className="inline-flex items-center gap-1 text-gray-400 hover:text-yellow-200 mb-6"
      >
        <Icon kind="arrow_back" size={18} />
        <BaseText type="body2">{t("backToList")}</BaseText>
      </CustomLink>

      <header className="mb-8 pb-6 border-b border-gray-700">
        <BaseText type="h2" className="text-yellow-200 mb-4">
          {post.title}
        </BaseText>
        <BaseText type="body1" className="text-gray-300 mb-4">
          {post.description}
        </BaseText>
        <div className="flex flex-wrap gap-2 mb-4 pt-4">
          {post.tags.map(tag => (
            <Chip key={tag} label={tag} />
          ))}
        </div>
        <div className="flex items-center gap-4 text-gray-400 text-sm mt-4">
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

      <article className="prose prose-invert max-w-none pb-20">
        <MDXRemote source={post.content} components={mdxComponents} />
      </article>
    </div>
  );
};

export default BlogPostPage;
