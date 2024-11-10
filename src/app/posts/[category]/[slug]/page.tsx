import PostContent from "@/components/Blog/PostContent";
import { getPost, getPosts } from "@/utils/get/post";
import { Metadata } from "next";

interface Props {
  params: {
    category: string;
    slug: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { frontMatter } = await getPost(`${params.category}/${params.slug}`);

  return {
    title: frontMatter.title,
    description: frontMatter.excerpt,
  };
}

export async function generateStaticParams() {
  const { items: categories } = await getPosts();
  const paths: { category: string; slug: string }[] = [];

  categories?.forEach(category => {
    category.items?.forEach(post => {
      const [_, categoryName, slug] = post.path?.split("/") || [];
      if (categoryName && slug) {
        paths.push({
          category: categoryName,
          slug: slug,
        });
      }
    });
  });

  return paths;
}

export default async function PostPage({ params }: Props) {
  const { frontMatter, content } = await getPost(`${params.category}/${params.slug}`);

  return <PostContent frontMatter={frontMatter} content={content} />;
}
