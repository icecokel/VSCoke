import MdxContentComponent from "@/components/MdxContentComponent";
import { convertByFormat } from "@/utils/DateUtil";
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
      <div className="flex items-end gap-2 my-[1em]">
        <h1 className="text-[32px] font-bold ml-[0.5em]">{post.title}</h1>
        <time dateTime={post.date} className="text-sm text-gray-700">
          ({convertByFormat({ date: post.date })})
        </time>
      </div>
      <hr />
      <MdxContentComponent code={post.body.code} />
    </article>
  );
};

export default PostLayout;
