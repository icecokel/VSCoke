import { MdxContainer } from "@/components/mdx/mdx-container";

interface Props {
  params: {
    slug: string;
  };
}

// export async function generateMetadata({ params }: Props): Promise<Metadata> {
//   const { frontMatter } = await getPost(`${params.category}/${params.slug}`);

//   return {
//     title: frontMatter.title,
//     description: frontMatter.excerpt,
//   };
// }

// export async function generateStaticParams() {
//   const postsTree = await getPosts();
//   const paths: { category: string; slug: string }[] = [];

//   postsTree.items?.forEach(category => {
//     category.items?.forEach(post => {
//       if (post.path) {
//         const pathParts = post.path.split("/").filter(Boolean);
//         if (pathParts[1] && pathParts[2]) {
//           paths.push({
//             category: pathParts[1],
//             slug: pathParts[2],
//           });
//         }
//       }
//     });
//   });
//   return paths;
// }

export default async function PostPage({ params }: Props) {
  return <MdxContainer mdxPath={`study/${params.slug}`} />;
}

// export const dynamicParams = false;
