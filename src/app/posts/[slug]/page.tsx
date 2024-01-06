import HeadTitle from "@/components/Blog/HeadTitle";
import NameCard from "@/components/Blog/NameCard";
import MdxContentComponent from "@/components/mdx/MdxContents";
import { allPosts } from "contentlayer/generated";

export const generateStaticParams = async () =>
  allPosts.map(post => ({ slug: post._raw.flattenedPath }));

export const generateMetadata = ({ params }: any) => {
  const post = allPosts.find(post => post._raw.flattenedPath === params.slug);

  if (!post) {
    return;
  }

  return { title: post.title };
};

const PostLayout = ({ params }: { params: { slug: string } }) => {
  const post = allPosts.find(post => post._raw.flattenedPath === params.slug);

  if (!post) {
    return;
  }

  return (
    <article className="py-8 w-full">
      <HeadTitle title={post.title} date={post.date} />
      <hr />
      <MdxContentComponent code={post.body.code} />
      <NameCard />
    </article>
  );
};

export default PostLayout;
