import { getAllPosts, getAllTags } from "@/lib/blog";
import PostList from "@/components/blog/post-list";
import BaseText from "@/components/base-ui/text";
import Chip from "@/components/base-ui/chip";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { ShareQrDialog } from "@/components/share/share-qr-dialog";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("blog");
  return {
    title: t("title"),
    description: t("description"),
  };
};

const BlogPage = async () => {
  const t = await getTranslations("blog");
  const posts = getAllPosts();
  const tags = getAllTags();

  return (
    <div className="p-3 md:p-5">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <BaseText type="h3" className="text-yellow-200 mb-2">
            {t("title")}
          </BaseText>
          <BaseText type="body1" className="text-gray-300">
            {t("description")}
          </BaseText>
        </div>
        <div className="flex items-center gap-2">
          <ShareLinkButton />
          <ShareQrDialog />
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {tags.map(tag => (
            <Chip key={tag.label} label={`${tag.label} (${tag.count})`} />
          ))}
        </div>
      )}

      <PostList posts={posts} />
    </div>
  );
};

export default BlogPage;
