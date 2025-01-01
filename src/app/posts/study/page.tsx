import HeadTitle from "@/components/Blog/HeadTitle";
import NameCard from "@/components/Blog/NameCard";
import { getPost, getPosts } from "@/utils/get/post";
import { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote";

interface Props {
  params: {
    category: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { frontMatter } = await getPost(params.category);

  return {
    title: frontMatter.title,
    description: frontMatter.excerpt,
  };
}

// export async function generateStaticParams() {
//   const { items: categories } = await getPosts();

//   return (
//     categories?.map(category => ({
//       category: category.label,
//     })) || []
//   );
// }

export default async function CategoryPage({ params }: Props) {
  const { content } = await import(`@/posts/${params.category}.mdx`);

  return (
    <div>test</div>
    // <article className="py-8 w-full">
    //   <HeadTitle title={frontMatter.title} date={frontMatter.date} />
    //   <hr />
    //   <MDXRemote {...content} />
    //   <NameCard />
    // </article>
  );
}
