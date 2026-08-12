import type {
  AnchorHTMLAttributes,
  BlockquoteHTMLAttributes,
  HTMLAttributes,
  ImgHTMLAttributes,
  LiHTMLAttributes,
  OlHTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import BaseText from "@/components/base-ui/text";
import { PreBlock } from "@/components/blog/pre-block";
import { cn } from "@/lib/utils";

interface PostElementProps {
  children?: ReactNode;
}

interface PostCodeBlockProps {
  code: string;
  language?: string;
}

interface PostImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "src"> {
  alt: string;
  src: string;
}

export const isLegacyBlogImageUrl = (src: string): boolean => {
  return src.startsWith("https://blog.kakaocdn.net/");
};

export const PostHeading1 = ({ children }: PostElementProps) => (
  <BaseText type="h3" className="mt-8 mb-4 text-yellow-200" data-blog-speech-segment>
    {children}
  </BaseText>
);

export const PostHeading2 = ({ children }: PostElementProps) => (
  <BaseText type="h4" className="mt-6 mb-3 text-white/90" data-blog-speech-segment>
    {children}
  </BaseText>
);

export const PostHeading3 = ({ children }: PostElementProps) => (
  <BaseText type="h5" className="mt-4 mb-2 text-white/80" data-blog-speech-segment>
    {children}
  </BaseText>
);

export const PostParagraph = ({ children }: PostElementProps) => (
  <p className="mb-4 text-base leading-relaxed text-gray-200/95" data-blog-speech-segment>
    {children}
  </p>
);

export const PostUnorderedList = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLUListElement>) => (
  <ul className={cn("mb-4 ml-6 list-disc text-gray-200", className)} {...props}>
    {children}
  </ul>
);

export const PostOrderedList = ({
  children,
  className,
  ...props
}: OlHTMLAttributes<HTMLOListElement>) => (
  <ol className={cn("mb-4 ml-6 list-decimal text-gray-200", className)} {...props}>
    {children}
  </ol>
);

export const PostListItem = ({
  children,
  className,
  ...props
}: LiHTMLAttributes<HTMLLIElement>) => (
  <li className={cn("mb-1", className)} data-blog-speech-segment {...props}>
    {children}
  </li>
);

export const PostLink = ({
  children,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a
    className={cn("text-blue-400 underline hover:text-blue-300", className)}
    target="_blank"
    rel="noopener noreferrer"
    {...props}
  >
    {children}
  </a>
);

export const PostBlockquote = ({
  children,
  className,
  ...props
}: BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
  <blockquote
    className={cn("my-4 border-l-4 border-yellow-200/50 pl-4 text-gray-300 italic", className)}
    data-blog-speech-segment
    {...props}
  >
    {children}
  </blockquote>
);

export const PostInlineCode = ({ children, className, ...props }: HTMLAttributes<HTMLElement>) => (
  <code
    className={cn("rounded bg-gray-700/50 px-1.5 py-0.5 text-sm text-yellow-200/90", className)}
    {...props}
  >
    {children}
  </code>
);

export const PostCodeBlock = ({ code, language }: PostCodeBlockProps) => (
  <PreBlock>
    <code className={language ? `language-${language}` : undefined}>{code}</code>
  </PreBlock>
);

export const PostHorizontalRule = () => <hr className="my-8 border-gray-600" />;

export const PostStrong = ({ children }: PostElementProps) => (
  <strong className="font-bold text-white">{children}</strong>
);

export const PostEmphasis = ({ children }: PostElementProps) => (
  <em className="italic">{children}</em>
);

const PostLegacyImageNotice = ({ alt }: Pick<PostImageProps, "alt">) => (
  <div
    className="my-6 flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-800/70 p-4 text-gray-200"
    data-blog-speech-exclude
  >
    <PhotoIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-yellow-200" />
    <div>
      <p className="m-0 font-semibold text-white">이전 스크린샷 안내</p>
      <p className="m-0 mt-1 text-sm leading-6">
        원본 스크린샷은 만료된 외부 링크라 표시하지 않습니다. 본문의 명령과 설명을 기준으로 진행해
        주세요.
      </p>
      {alt && <p className="m-0 mt-2 text-sm text-gray-400">설명: {alt}</p>}
    </div>
  </div>
);

export const PostImage = ({ alt, className, src, ...props }: PostImageProps) => {
  if (isLegacyBlogImageUrl(src)) {
    return <PostLegacyImageNotice alt={alt} />;
  }

  return (
    // 기존 블로그 원격 이미지는 크기 정보가 없어 이 경계에서만 native img를 유지한다.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={cn("my-6 h-auto max-w-full rounded-lg", className)}
      decoding="async"
      loading="lazy"
      src={src}
      {...props}
    />
  );
};

export const PostTable = ({
  children,
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) => (
  <div className="my-6 overflow-x-auto">
    <table
      className={cn("w-full border-collapse text-left text-sm text-gray-200", className)}
      {...props}
    >
      {children}
    </table>
  </div>
);

export const PostTableHead = ({ children }: PostElementProps) => (
  <thead className="bg-gray-800/80">{children}</thead>
);

export const PostTableBody = ({ children }: PostElementProps) => <tbody>{children}</tbody>;

export const PostTableRow = ({ children }: PostElementProps) => (
  <tr className="border-b border-gray-700">{children}</tr>
);

export const PostTableHeader = ({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn("px-3 py-2 font-bold text-white", className)}
    data-blog-speech-segment
    {...props}
  >
    {children}
  </th>
);

export const PostTableCell = ({
  children,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-3 py-2 align-top", className)} data-blog-speech-segment {...props}>
    {children}
  </td>
);
