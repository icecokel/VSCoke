import type { PostMeta } from "@/types/blog";

interface CreateBlogPostJsonLdOptions {
  canonicalUrl: string;
  locale: string;
  post: PostMeta;
}

const siteUrl = "https://vscoke.vercel.app";
const authorUrl = `${siteUrl}/ko-KR/readme`;

export const createBlogPostJsonLd = ({
  canonicalUrl,
  locale,
  post,
}: CreateBlogPostJsonLdOptions) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": `${canonicalUrl}#blog-post`,
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": canonicalUrl,
  },
  url: canonicalUrl,
  headline: post.title,
  description: post.description,
  image: [
    {
      "@type": "ImageObject",
      url: `${siteUrl}/og.png`,
      width: 1200,
      height: 630,
    },
  ],
  datePublished: post.date,
  author: [
    {
      "@type": "Person",
      "@id": `${authorUrl}#person`,
      name: "icecokel",
      url: authorUrl,
    },
  ],
  publisher: {
    "@type": "Person",
    "@id": `${authorUrl}#person`,
    name: "icecokel",
    url: authorUrl,
  },
  articleSection: post.category,
  keywords: post.tags.join(", "),
  inLanguage: locale,
  isPartOf: {
    "@type": "Blog",
    "@id": `${siteUrl}/${locale}/blog#blog`,
    name: "VSCoke Blog",
  },
});

export const serializeJsonLd = (jsonLd: ReturnType<typeof createBlogPostJsonLd>): string => {
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
};
