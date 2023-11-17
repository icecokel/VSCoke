import { allPosts } from "contentlayer/generated";
import { format, parseISO } from "date-fns";
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
  code: ({ children }) => (
    <span
      style={{
        color: "#EB5757",
        padding: "3px 5px",
        backgroundColor: "rgba(135, 131, 120, 0.15)",
        borderRadius: "4px",
      }}
    >
      {children}
    </span>
  ),
  pre: ({ children }) => (
    <div
      style={{
        padding: "1em",
        backgroundColor: "rgba(0,0,0,0.8)",
        borderRadius: "4px",
        color: "black",
        fontWeight: 500,
        margin: "1em 0px",
      }}
    >
      <code
        style={{
          backgroundColor: "transparent",
        }}
      >
        {children}
      </code>
    </div>
  ),
};

export const generateStaticParams = async () =>
  allPosts.map(post => ({ slug: post._raw.flattenedPath }));

export const generateMetadata = ({ params }: any) => {
  const post = allPosts.find(post => post._raw.flattenedPath === params.slug);

  if (!post) {
    return;
  }

  return { title: post.title };
};

const PostLayout = ({ params }: { params: { slug: string } }) => {
  const post = allPosts.find(post => post._raw.flattenedPath === params.slug);

  console.log(post);
  if (!post) {
    return;
  }

  const MDXContent = useMDXComponent(post.body.code);

  return (
    <article className="py-8 mx-auto">
      <div className="mb-8 text-center">
        <time dateTime={post.date} className="mb-1 text-xs text-gray-600">
          {format(parseISO(post.date), "LLLL d, yyyy")}
        </time>
        <h1>{post.title}</h1>
      </div>
      <MDXContent components={mdxComponents} />
    </article>
  );
};

export default PostLayout;
