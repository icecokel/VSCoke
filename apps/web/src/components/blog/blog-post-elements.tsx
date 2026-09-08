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
  <h2
    className="mt-12 mb-5 scroll-mt-8 text-2xl leading-snug font-semibold tracking-tight text-foreground sm:text-3xl"
    data-blog-speech-segment
  >
    {children}
  </h2>
);

export const PostHeading2 = ({ children }: PostElementProps) => (
  <h3
    className="mt-10 mb-4 scroll-mt-8 text-xl leading-snug font-semibold tracking-tight text-foreground sm:text-2xl"
    data-blog-speech-segment
  >
    {children}
  </h3>
);

export const PostHeading3 = ({ children }: PostElementProps) => (
  <h4
    className="mt-7 mb-3 scroll-mt-8 text-lg leading-relaxed font-semibold text-foreground"
    data-blog-speech-segment
  >
    {children}
  </h4>
);

export const PostParagraph = ({ children }: PostElementProps) => (
  <p className="mb-5 text-base leading-8 text-foreground/85" data-blog-speech-segment>
    {children}
  </p>
);

export const PostUnorderedList = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLUListElement>) => (
  <ul
    className={cn(
      "mb-6 list-disc space-y-2 pl-6 text-foreground/85 marker:text-muted-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </ul>
);

export const PostOrderedList = ({
  children,
  className,
  ...props
}: OlHTMLAttributes<HTMLOListElement>) => (
  <ol
    className={cn(
      "mb-6 list-decimal space-y-2 pl-6 text-foreground/85 marker:font-medium marker:text-muted-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </ol>
);

export const PostListItem = ({
  children,
  className,
  ...props
}: LiHTMLAttributes<HTMLLIElement>) => (
  <li className={cn("pl-1 leading-8 [&>p]:mb-2", className)} data-blog-speech-segment {...props}>
    {children}
  </li>
);

export const PostLink = ({
  children,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a
    className={cn(
      "rounded-sm text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      className,
    )}
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
    className={cn(
      "my-7 rounded-r-xl border-l-2 border-primary/60 bg-muted/40 px-5 py-4 text-foreground/85 [&>p:last-child]:mb-0",
      className,
    )}
    data-blog-speech-segment
    {...props}
  >
    {children}
  </blockquote>
);

export const PostInlineCode = ({ children, className, ...props }: HTMLAttributes<HTMLElement>) => (
  <code
    className={cn(
      "rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.875em] text-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </code>
);

export const PostCodeBlock = ({ code, language }: PostCodeBlockProps) => (
  <PreBlock variant="article" language={language}>
    <code className={language ? `language-${language}` : undefined}>{code}</code>
  </PreBlock>
);

export const PostHorizontalRule = () => <hr className="my-10 border-border" />;

export const PostStrong = ({ children }: PostElementProps) => (
  <strong className="font-semibold text-foreground">{children}</strong>
);

export const PostEmphasis = ({ children }: PostElementProps) => (
  <em className="italic">{children}</em>
);

const PostLegacyImageNotice = ({ alt }: Pick<PostImageProps, "alt">) => (
  <div
    className="my-7 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-5 text-muted-foreground"
    data-blog-speech-exclude
    data-testid="blog-legacy-image-notice"
  >
    <PhotoIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
    <div>
      <p className="m-0 font-semibold text-foreground">이전 스크린샷 안내</p>
      <p className="m-0 mt-1 text-sm leading-6">
        원본 스크린샷은 만료된 외부 링크라 표시하지 않습니다. 본문의 명령과 설명을 기준으로 진행해
        주세요.
      </p>
      {alt && <p className="m-0 mt-2 text-sm text-muted-foreground">설명: {alt}</p>}
    </div>
  </div>
);

export const PostImage = ({ alt, className, src, ...props }: PostImageProps) => {
  if (isLegacyBlogImageUrl(src)) return <PostLegacyImageNotice alt={alt} />;

  return (
    // 기존 블로그 원격 이미지는 크기 정보가 없어 이 경계에서만 native img를 유지한다.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={cn("my-8 h-auto max-w-full rounded-xl border border-border", className)}
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
  <div
    className="my-7 max-w-full overflow-x-auto rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    tabIndex={0}
  >
    <table
      className={cn(
        "w-full border-collapse text-left text-sm leading-7 text-foreground/85",
        className,
      )}
      {...props}
    >
      {children}
    </table>
  </div>
);

export const PostTableHead = ({ children }: PostElementProps) => (
  <thead className="bg-muted/70 text-foreground">{children}</thead>
);

export const PostTableBody = ({ children }: PostElementProps) => <tbody>{children}</tbody>;

export const PostTableRow = ({ children }: PostElementProps) => (
  <tr className="border-b border-border last:border-0">{children}</tr>
);

export const PostTableHeader = ({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn("px-4 py-3 font-semibold text-foreground", className)}
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
  <td className={cn("px-4 py-3 align-top", className)} data-blog-speech-segment {...props}>
    {children}
  </td>
);
