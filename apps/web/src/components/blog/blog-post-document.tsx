import { Fragment, type ReactNode } from "react";
import {
  PostBlockquote,
  PostCodeBlock,
  PostEmphasis,
  PostHeading1,
  PostHeading2,
  PostHeading3,
  PostHorizontalRule,
  PostImage,
  PostInlineCode,
  PostLink,
  PostListItem,
  PostOrderedList,
  PostParagraph,
  PostStrong,
  PostTable,
  PostTableBody,
  PostTableCell,
  PostTableHead,
  PostTableHeader,
  PostTableRow,
  PostUnorderedList,
} from "@/components/blog/blog-post-elements";

interface PostTextNode {
  type: "text";
  value: string;
}

interface PostInlineCodeNode {
  type: "inlineCode";
  value: string;
}

interface PostBreakNode {
  type: "break";
}

interface PostStrongNode {
  type: "strong";
  children: PostInlineNode[];
}

interface PostEmphasisNode {
  type: "emphasis";
  children: PostInlineNode[];
}

interface PostLinkNode {
  type: "link";
  url: string;
  title: string | null;
  children: PostInlineNode[];
}

interface PostImageNode {
  type: "image";
  url: string;
  alt: string;
  title: string | null;
}

export type PostInlineNode =
  | PostTextNode
  | PostInlineCodeNode
  | PostBreakNode
  | PostStrongNode
  | PostEmphasisNode
  | PostLinkNode
  | PostImageNode;

interface PostHeadingNode {
  type: "heading";
  depth: 1 | 2 | 3;
  children: PostInlineNode[];
}

interface PostParagraphNode {
  type: "paragraph";
  children: PostInlineNode[];
}

interface PostCodeNode {
  type: "code";
  language: string | null;
  value: string;
}

interface PostBlockquoteNode {
  type: "blockquote";
  children: PostDocumentNode[];
}

interface PostListItemNode {
  type: "listItem";
  children: PostDocumentNode[];
}

interface PostListNode {
  type: "list";
  ordered: boolean;
  start: number | null;
  children: PostListItemNode[];
}

interface PostHorizontalRuleNode {
  type: "thematicBreak";
}

type PostTableAlignment = "left" | "center" | "right" | null;

interface PostTableNode {
  type: "table";
  align: PostTableAlignment[];
  rows: PostInlineNode[][][];
}

export type PostDocumentNode =
  | PostHeadingNode
  | PostParagraphNode
  | PostCodeNode
  | PostBlockquoteNode
  | PostListNode
  | PostHorizontalRuleNode
  | PostTableNode;

interface BlogPostDocumentProps {
  nodes: PostDocumentNode[];
}

const alignmentClasses: Record<Exclude<PostTableAlignment, null>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const getAlignmentClass = (alignment: PostTableAlignment): string | undefined => {
  return alignment ? alignmentClasses[alignment] : undefined;
};

const renderInlineNodes = (nodes: PostInlineNode[], keyPrefix: string): ReactNode => {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (node.type) {
      case "text":
        return <Fragment key={key}>{node.value}</Fragment>;
      case "inlineCode":
        return <PostInlineCode key={key}>{node.value}</PostInlineCode>;
      case "break":
        return <br key={key} />;
      case "strong":
        return (
          <PostStrong key={key}>{renderInlineNodes(node.children, `${key}-strong`)}</PostStrong>
        );
      case "emphasis":
        return (
          <PostEmphasis key={key}>
            {renderInlineNodes(node.children, `${key}-emphasis`)}
          </PostEmphasis>
        );
      case "link":
        return (
          <PostLink key={key} href={node.url} title={node.title ?? undefined}>
            {renderInlineNodes(node.children, `${key}-link`)}
          </PostLink>
        );
      case "image":
        return (
          <PostImage key={key} src={node.url} alt={node.alt} title={node.title ?? undefined} />
        );
    }
  });
};

const renderTable = (node: PostTableNode, key: string) => {
  const [headerRow, ...bodyRows] = node.rows;

  return (
    <PostTable key={key}>
      {headerRow && (
        <PostTableHead>
          <PostTableRow>
            {headerRow.map((cell, cellIndex) => (
              <PostTableHeader
                key={`${key}-header-${cellIndex}`}
                className={getAlignmentClass(node.align[cellIndex] ?? null)}
              >
                {renderInlineNodes(cell, `${key}-header-${cellIndex}`)}
              </PostTableHeader>
            ))}
          </PostTableRow>
        </PostTableHead>
      )}
      {bodyRows.length > 0 && (
        <PostTableBody>
          {bodyRows.map((row, rowIndex) => (
            <PostTableRow key={`${key}-row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <PostTableCell
                  key={`${key}-cell-${rowIndex}-${cellIndex}`}
                  className={getAlignmentClass(node.align[cellIndex] ?? null)}
                >
                  {renderInlineNodes(cell, `${key}-cell-${rowIndex}-${cellIndex}`)}
                </PostTableCell>
              ))}
            </PostTableRow>
          ))}
        </PostTableBody>
      )}
    </PostTable>
  );
};

const renderDocumentNodes = (nodes: PostDocumentNode[], keyPrefix: string): ReactNode => {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (node.type) {
      case "heading": {
        const children = renderInlineNodes(node.children, `${key}-heading`);

        if (node.depth === 1) {
          return <PostHeading1 key={key}>{children}</PostHeading1>;
        }
        if (node.depth === 2) {
          return <PostHeading2 key={key}>{children}</PostHeading2>;
        }
        return <PostHeading3 key={key}>{children}</PostHeading3>;
      }
      case "paragraph": {
        if (node.children.length === 1 && node.children[0].type === "image") {
          return renderInlineNodes(node.children, `${key}-image`);
        }

        return (
          <PostParagraph key={key}>
            {renderInlineNodes(node.children, `${key}-paragraph`)}
          </PostParagraph>
        );
      }
      case "code":
        return <PostCodeBlock key={key} code={node.value} language={node.language ?? undefined} />;
      case "blockquote":
        return (
          <PostBlockquote key={key}>
            {renderDocumentNodes(node.children, `${key}-blockquote`)}
          </PostBlockquote>
        );
      case "list": {
        const items = node.children.map((item, itemIndex) => (
          <PostListItem key={`${key}-item-${itemIndex}`}>
            {renderDocumentNodes(item.children, `${key}-item-${itemIndex}`)}
          </PostListItem>
        ));

        if (node.ordered) {
          return (
            <PostOrderedList key={key} start={node.start ?? undefined}>
              {items}
            </PostOrderedList>
          );
        }
        return <PostUnorderedList key={key}>{items}</PostUnorderedList>;
      }
      case "thematicBreak":
        return <PostHorizontalRule key={key} />;
      case "table":
        return renderTable(node, key);
    }
  });
};

export const BlogPostDocument = ({ nodes }: BlogPostDocumentProps) => {
  return <>{renderDocumentNodes(nodes, "post")}</>;
};
