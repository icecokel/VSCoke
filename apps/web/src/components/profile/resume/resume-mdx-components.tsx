import type { MDXComponents } from "mdx/types";
import BaseText from "@/components/base-ui/text";
import Chip from "@/components/base-ui/chip";
import Icon from "@/components/base-ui/icon";
import Container from "@/components/base-ui/container";
import Avatar from "@/components/base-ui/avatar";
import SlideGroup from "@/components/base-ui/slide-group";
import { PreBlock } from "@/components/blog/pre-block";
import {
  PostBlockquote,
  PostEmphasis,
  PostHeading1,
  PostHeading2,
  PostHeading3,
  PostHorizontalRule,
  PostInlineCode,
  PostLink,
  PostListItem,
  PostOrderedList,
  PostParagraph,
  PostStrong,
  PostUnorderedList,
} from "@/components/blog/blog-post-elements";

export const mdxComponents: MDXComponents = {
  h1: PostHeading1,
  h2: PostHeading2,
  h3: PostHeading3,
  p: PostParagraph,
  ul: PostUnorderedList,
  ol: PostOrderedList,
  li: PostListItem,
  a: PostLink,
  blockquote: PostBlockquote,
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return <PostInlineCode>{children}</PostInlineCode>;
    }
    return <code className={className}>{children}</code>;
  },
  pre: ({ children, ...props }) => <PreBlock {...props}>{children}</PreBlock>,
  hr: PostHorizontalRule,
  strong: PostStrong,
  em: PostEmphasis,
  Tag: ({ children }: { children: React.ReactNode }) => (
    <Chip label={String(children)} className="mr-1" />
  ),
  // Custom Components available in MDX
  Icon,
  Container,
  Avatar,
  Text: BaseText,
  SlideGroup,
};
