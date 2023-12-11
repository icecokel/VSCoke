import MdxCodeBlock, { IMdxCodeblockProps, TCodeBlockType } from "./mdx/MdxCodeBlock";
import MdxTable, { IMdxTableProps } from "./mdx/MdxTable";
import type { MDXComponents } from "mdx/types";
import { useMDXComponent } from "next-contentlayer/hooks";
import Link from "next/link";

const mdxComponents: MDXComponents = {
  h1: ({ children }) => (
    <h1
      style={{
        fontSize: "30x",
        fontWeight: 600,
        padding: "3px 2px",
        marginTop: "32px",
        marginBottom: "4px",
      }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      style={{
        fontSize: "24px",
        fontWeight: 600,
        padding: "3px 2px",
        marginTop: "22px",
        marginBottom: "1px",
      }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: "20px", fontWeight: 600, padding: "3px 2px" }}>{children}</h3>
  ),
  ul: ({ children }) => <ul style={{ listStyle: "disc", paddingLeft: "2em" }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ listStyle: "decimal", paddingLeft: "2em" }}>{children}</ol>,
  li: ({ children }) => <li style={{ lineHeight: 2 }}>{children}</li>,
  blockquote: ({ children }) => (
    <div style={{ borderLeft: "0.25em solid gray", padding: "1em" }}>{children}</div>
  ),
  p: ({ children }) => <p style={{ margin: "0.4em 0px", lineHeight: 2 }}>{children}</p>,
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
      <Link href={href ?? ""} className="text-blue-300/80 hover:text-blue-300 hover:underline">
        {children}
      </Link>
    );
  },
  CodeBlock: (arg: IMdxCodeblockProps) => <MdxCodeBlock {...arg} />,
  Table: (arg: IMdxTableProps) => <MdxTable {...arg} />,
};

const MdxContentComponent = ({ code }: { code: string }) => {
  const MDXContent = useMDXComponent(code);
  return <MDXContent components={mdxComponents} />;
};

export default MdxContentComponent;
