import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import BaseText from "@/components/base-ui/text";
import Chip from "@/components/base-ui/chip";
import Icon from "@/components/base-ui/icon";
import Link from "next/link";
import type { Metadata } from "next";
import type { MDXComponents } from "mdx/types";
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

// MDX Components for server-side rendering
const mdxComponents: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="mt-8 mb-4 text-2xl font-bold text-yellow-200">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 mb-3 text-xl font-bold text-yellow-200/90">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-2 text-lg font-bold text-yellow-200/80">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-4 leading-relaxed text-gray-200">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 ml-6 list-disc text-gray-200">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal text-gray-200">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 underline"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-yellow-200/50 pl-4 my-4 italic text-gray-300">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-gray-700/50 px-1.5 py-0.5 rounded text-sm text-yellow-200/90">
          {children}
        </code>
      );
    }
    return <code className={className}>{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto text-sm">{children}</pre>
  ),
  hr: () => <hr className="my-8 border-gray-600" />,
  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
};

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
