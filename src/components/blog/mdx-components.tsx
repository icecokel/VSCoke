import type { MDXComponents } from "mdx/types";
import BaseText from "@/components/base-ui/text";
import Chip from "@/components/base-ui/chip";
import Icon from "@/components/base-ui/icon";
import Container from "@/components/base-ui/container";
import Avatar from "@/components/base-ui/avatar";
import SlideGroup from "@/components/base-ui/slide-group";

export const mdxComponents: MDXComponents = {
  h1: ({ children }) => (
    <BaseText type="h3" className="mt-8 mb-4 text-yellow-200">
      {children}
    </BaseText>
  ),
  h2: ({ children }) => (
    <BaseText type="h4" className="mt-6 mb-3 text-white/90">
      {children}
    </BaseText>
  ),
  h3: ({ children }) => (
    <BaseText type="h5" className="mt-4 mb-2 text-white/80">
      {children}
    </BaseText>
  ),
  p: ({ children }) => (
    <BaseText type="body1" className="mb-4 leading-relaxed text-gray-200/95">
      {children}
    </BaseText>
  ),
  ul: ({ children }) => <ul className="mb-4 ml-6 list-disc text-gray-200">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal text-gray-200">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 underline"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-yellow-200/50 pl-4 my-4 italic text-gray-300">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-gray-700/50 px-1.5 py-0.5 rounded text-sm text-yellow-200/90">
          {children}
        </code>
      );
    }
    return <code className={className}>{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto text-sm">{children}</pre>
  ),
  hr: () => <hr className="my-8 border-gray-600" />,
  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
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
