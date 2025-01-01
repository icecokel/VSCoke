"use client";

interface MdxContainerProps {
  mdxPath: string;
}

export const MdxContainer = async ({ mdxPath }: MdxContainerProps) => {
  console.log(`@/posts/${mdxPath}.mdx`);
  const { content } = await import(`@/posts/${mdxPath}.mdx`);

  console.log(content);
  return <div>{content}</div>;
};
