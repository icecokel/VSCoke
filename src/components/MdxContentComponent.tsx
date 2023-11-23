import MdxCodeBlock, { IMdxCodeblockProps } from "./mdx/MdxCodeBlock";
import MdxTable, { IMdxTableProps } from "./mdx/MdxTable";
import type { MDXComponents } from "mdx/types";
import { useMDXComponent } from "next-contentlayer/hooks";

const mdxComponents: MDXComponents = {
  h1: ({ children }) => (
    <h3
      style={{
        fontSize: "30x",
        fontWeight: 600,
        padding: "3px 2px",
        marginTop: "32px",
        marginBottom: "4px",
      }}
    >
      {children}
    </h3>
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
  ol: ({ children }) => (
    <ol style={{ listStyle: "decimal-leading-zero", paddingLeft: "2em" }}>{children}</ol>
  ),
  blockquote: ({ children }) => (
    <div style={{ borderLeft: "0.25em solid gray", padding: "1em" }}>{children}</div>
  ),
  p: ({ children }) => <p style={{ margin: "0.4em 0px" }}>{children}</p>,
  pre: ({ children }) => (
    <pre
      style={{
        padding: "1em",
        backgroundColor: "rgba(0,0,0,0.8)",
        borderRadius: "4px",
        margin: "1em 0px",
      }}
    >
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code
      style={{
        color: "#EB5757",
        padding: "3px 5px",
        backgroundColor: "rgba(135, 131, 120, 0.15)",
        borderRadius: "4px",
      }}
    >
      {children}
    </code>
  ),
  CodeBlock: (arg: IMdxCodeblockProps) => <MdxCodeBlock {...arg} />,
  Table: (arg: IMdxTableProps) => <MdxTable {...arg} />,
};

const MdxContentComponent = ({ code }: { code: string }) => {
  const MDXContent = useMDXComponent(code);
  console.log(MDXContent);
  return <MDXContent components={mdxComponents} />;
};

export default MdxContentComponent;
