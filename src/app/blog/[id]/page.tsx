import Blog from "@/components/Blog";

interface IBlogPageProps {
  params: {
    id: string;
  };
}

/**
 * 블로그
 *
 * @param 블로그 url
 * @returns 블로그 컴포넌트
 */

const BlogPage = ({ params }: IBlogPageProps) => {
  return <Blog id={params.id} />;
};

export default BlogPage;
