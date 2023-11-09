import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
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
