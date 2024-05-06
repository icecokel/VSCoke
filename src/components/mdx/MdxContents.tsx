import MdxCodeBlock, { IMdxCodeblockProps, TCodeBlockType } from "./MdxCodeBlock";
import MdxLinkHead from "./MdxLinkHead/index";
import MdxSchematic, { IMdxSchematicProps } from "./MdxSchematic";
import MdxTable, { IMdxTableProps } from "./MdxTable";
import MdxTip, { IMdxTipProps } from "./MdxTip";
import type { MDXComponents } from "mdx/types";
import { useMDXComponent } from "next-contentlayer/hooks";
import Link from "next/link";

const mdxComponents: MDXComponents = {
  h1: ({ children }) => <MdxLinkHead variant="h1"> {children}</MdxLinkHead>,
  h2: ({ children }) => <MdxLinkHead variant="h2"> {children}</MdxLinkHead>,
  h3: ({ children }) => <MdxLinkHead variant="h3"> {children}</MdxLinkHead>,
  ul: ({ children }) => <ul style={{ listStyle: "disc", paddingLeft: "2em" }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ listStyle: "decimal", paddingLeft: "2em" }}>{children}</ol>,
  li: ({ children }) => <li style={{ lineHeight: 2 }}>{children}</li>,
  blockquote: ({ children }) => (
    <div style={{ borderLeft: "0.25em solid gray", padding: "1em" }}>{children}</div>
  ),
  p: ({ children }) => (
    <p style={{ fontSize: "1rem", lineHeight: "1.5rem", color: "rgba(0,0,0,0.87)" }}>{children}</p>
  ),
  strong: ({ children }) => <strong>{children}</strong>,
  pre: ({ children }) => {
    const {
      props: { className, children: code },
    } = children as any;
    const arg = {
      type: className?.replaceAll("language-", "") as TCodeBlockType,
      code: code,
    };
    return <MdxCodeBlock {...arg} />;
  },
  code: ({ children }) => {
    return (
      <code
        style={{
          color: "#EB5757",
          padding: "3px 5px",
          backgroundColor: "rgba(135, 131, 120, 0.15)",
          borderRadius: "4px",
          fontWeight: 600,
        }}
      >
        {children}
      </code>
    );
  },
  a: ({ children, href }) => {
    return (
      <Link
        href={href ?? ""}
        target="_blank"
        className="text-blue-300/80 hover:text-blue-300 hover:underline"
      >
        {children}
      </Link>
    );
  },
  CodeBlock: (arg: IMdxCodeblockProps) => <MdxCodeBlock {...arg} />,
  Table: (arg: IMdxTableProps) => <MdxTable {...arg} />,
  hr: () => {
    return <hr className="border-gray-500/40 rounded-sm my-4" />;
  },
  MdxSchematic: (arg: IMdxSchematicProps) => {
    return <MdxSchematic {...arg} />;
  },
  MdxTip: ({ children, ...arg }: IMdxTipProps) => {
    return <MdxTip {...arg}>{children}</MdxTip>;
  },
};

const MdxContent = ({ code }: { code: string }) => {
  const MDXContent = useMDXComponent(code);
  return <MDXContent components={mdxComponents} />;
};

export default MdxContent;
