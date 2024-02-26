"use client";

import { mdxContext } from "../../contexts/MdxContext";
import { IHaveChildren } from "@/models/common";
import { usePathname } from "next/navigation";
import { CSSProperties, createElement, useContext, useEffect } from "react";

export type TVariant = "h1" | "h2" | "h3";

interface MdxLinkHeadProps extends IHaveChildren {
  variant: TVariant;
}

const STYLE_MAP: { [key in TVariant]: CSSProperties } = {
  h1: {
    fontSize: "30px",
    fontWeight: 600,
    padding: "3px 2px",
    height: "45px",
    marginTop: "1em",
    marginBottom: "4px",
    position: "sticky",
    top: "4px",
    backgroundColor: "#FFFFFF",
  },
  h2: {
    fontSize: "24px",
    fontWeight: 600,
    padding: "3px 2px",
    height: "45px",
    marginTop: "1em",
    marginBottom: "1px",
    position: "sticky",
    top: "4px",
    backgroundColor: "#FFFFFF",
  },
  h3: {
    fontSize: "20px",
    fontWeight: 600,
    marginTop: "1em",
    padding: "3px 2px",
    height: "45px",
    position: "sticky",
    top: "4px",
    backgroundColor: "#FFFFFF",
  },
};

export const PREFIX = "link-title";

const MdxLinkHead = ({ children, variant }: MdxLinkHeadProps) => {
  const { add } = useContext(mdxContext);
  const pathname = usePathname();

  const id = `${PREFIX}-${(children as string[])[1]}`;

  // // TODO 타입 개선
  useEffect(() => {
    add({ title: pathname, items: [{ type: variant, label: (children as string[])[1] }] });
  }, []);

  return createElement(variant, {
    id: `${id}`,
    style: STYLE_MAP[variant],
    children: <a href={`#${id}`}>{children}</a>,
  });
};

export default MdxLinkHead;
