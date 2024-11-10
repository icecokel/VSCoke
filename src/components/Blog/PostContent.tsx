
"use client"

import HeadTitle from "./HeadTitle";
import NameCard from "./NameCard";
import { MDXRemote } from "next-mdx-remote";

interface PostContentProps {
  frontMatter: {
    title: string;
    date: string;
  };
  content: any;
}

export default function PostContent({ frontMatter, content }: PostContentProps) {
  return (
    <article className="py-8 w-full">
      <HeadTitle title={frontMatter.title} date={frontMatter.date} />
      <hr />
      <MDXRemote {...content} />
      <NameCard />
    </article>
  );
} 