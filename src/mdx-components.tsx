import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => <h1 style={{ fontSize: "72px", fontWeight: 700 }}>{children}</h1>,
    h2: ({ children }) => <h1 style={{ fontSize: "68px", fontWeight: 700 }}>{children}</h1>,
    h3: ({ children }) => <h1 style={{ fontSize: "60px", fontWeight: 700 }}>{children}</h1>,
    h4: ({ children }) => <h1 style={{ fontSize: "42px", fontWeight: 700 }}>{children}</h1>,
    h5: ({ children }) => <h1 style={{ fontSize: "28px", fontWeight: 700 }}>{children}</h1>,
    h6: ({ children }) => <h1 style={{ fontSize: "24px", fontWeight: 700 }}>{children}</h1>,
    ul: ({ children }) => <ul style={{ listStyle: "disc", paddingLeft: "2em" }}>{children}</ul>,
    blockquote: ({ children }) => (
      <div style={{ borderLeft: "0.25em solid gray", padding: "1em" }}>{children}</div>
    ),
    pre: ({ children }) => (
      <div
        style={{
          padding: "1em",
          backgroundColor: "rgba(255,255,255,0.8)",
          borderRadius: "4px",
          color: "black",
          fontWeight: 500,
        }}
      >
        {children}
      </div>
    ),

    ...components,
  };
}
