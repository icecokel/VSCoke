import Blog from "@/components/Blog";

interface IBlogPageProps {
  params: {
    id: string;
  };
}

const BlogPage = ({ params }: IBlogPageProps) => {
  return <Blog id={params.id} />;
};

export default BlogPage;
