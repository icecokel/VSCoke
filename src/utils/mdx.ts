import fs from "fs";
import matter from "gray-matter";
import { MDXRemoteSerializeResult } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import path from "path";

export interface FrontMatter {
  title: string;
  date: string;
  excerpt?: string;
  [key: string]: any;
}

export interface PostData {
  frontMatter: FrontMatter;
  content: MDXRemoteSerializeResult;
}

/**
 * MDX 파일을 읽고 frontMatter와 직렬화된 content를 반환합니다
 */
export async function getMdxPost(filePath: string): Promise<PostData> {
  const source = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(source);

  const frontMatter: FrontMatter = {
    title: data.title || "Default Title",
    date: data.date || "1970-01-01",
    ...data,
  };

  const mdxSource = await serialize(content);

  return {
    frontMatter,
    content: mdxSource,
  };
}

/**
 * posts 디렉토리의 모든 MDX 파일 경로를 가져옵니다
 */
export function getAllMdxPaths() {
  const postsDirectory = path.join(process.cwd(), "posts");
  const files = fs.readdirSync(postsDirectory);

  return files.map(filename => ({
    category: filename.split("/")[0],
    slug: filename.replace(".mdx", ""),
  }));
}

/**
 * 특정 카테고리/슬러그에 해당하는 MDX 파일의 전체 경로를 반환합니다
 */
export function getMdxFilePath(category: string, slug?: string) {
  const fileName = slug ? `${category}/${slug}.mdx` : `${category}.mdx`;
  return path.join(process.cwd(), "posts", fileName);
}
