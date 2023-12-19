"use client";

import { mdxContext } from "./MdxContext";
import { IHaveChildren } from "@/models/common";
import { useContext, useEffect } from "react";

type TVariant = "h1" | "h2" | "h3";

interface MdxLinkHeadProps extends IHaveChildren {
  variant: TVariant;
}

const STYLE_MAP: { [key in TVariant]: object } = {
  h1: {
    fontSize: "30px",
    fontWeight: 600,
    padding: "3px 2px",
    marginTop: "32px",
    marginBottom: "4px",
  },
  h2: {
    fontSize: "24px",
    fontWeight: 600,
    padding: "3px 2px",
    marginTop: "22px",
    marginBottom: "1px",
  },
  h3: { fontSize: "20px", fontWeight: 600, padding: "3px 2px" },
};

export const PREFIX = "link-title";

const MdxLinkHead = ({ children, variant }: MdxLinkHeadProps) => {
  const { add } = useContext(mdxContext);

  const id = `${PREFIX}-${(children as string[])[1]}`;

  // TODO 타입 개선
  useEffect(() => {
    add((children as string[])[1]);
  }, []);
  return (
    <h1 id={id} style={STYLE_MAP[variant]}>
      <a href={`#${id}`}>{children}</a>
    </h1>
  );
};

export default MdxLinkHead;
