import { getAllPosts } from "@/lib/blog";
import PostList from "@/components/blog/post-list";
import BaseText from "@/components/base-ui/text";
import { getTranslations } from "next-intl/server";

const BlogDashboardPage = async () => {
  const t = await getTranslations("blog");
  const posts = getAllPosts();

  return (
    <div className="p-3 md:p-5">
      <div className="mb-6">
        <BaseText type="h3" className="text-yellow-200 mb-2">
          {t("dashboardTitle") || "Dashboard"}
        </BaseText>
        <BaseText type="body1" className="text-gray-300">
          {t("dashboardDescription") || "Admin dashboard for blog posts"}
        </BaseText>
      </div>

      <div className="mb-8 p-4 bg-gray-800 rounded-lg">
        <BaseText type="h5" className="mb-2 text-blue-300">
          Stats
        </BaseText>
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-sm text-gray-400">Total Posts</span>
            <span className="text-2xl font-bold">{posts.length}</span>
          </div>
        </div>
      </div>

      <PostList posts={posts} />
    </div>
  );
};

export default BlogDashboardPage;
