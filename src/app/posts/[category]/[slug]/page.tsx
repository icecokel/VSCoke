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
  const postsTree = await getPosts();
  const paths: { category: string; slug: string; }[] = [];
  
  postsTree.items?.forEach((category) => {
    category.items?.forEach((post) => {
      if (post.path) {
        const pathParts = post.path.split('/').filter(Boolean);
        if (pathParts[1] && pathParts[2]) {
          paths.push({
            category: pathParts[1],
            slug: pathParts[2],
          });
        }
      }
    });
  });

  return paths;
}

export default async function PostPage({ params }: Props) {
  const { frontMatter, content } = await getPost(`${params.category}/${params.slug}`);

  return <PostContent frontMatter={frontMatter} content={content} />;
}
