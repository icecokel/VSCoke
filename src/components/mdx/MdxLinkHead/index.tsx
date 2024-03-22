"use client";

import { mdxContext } from "../../../contexts/MdxContext";
import styles from "./style.module.css";
import { IHaveChildren } from "@/models/common";
import { usePathname } from "next/navigation";
import { createElement, useContext, useEffect } from "react";

export type TVariant = "h1" | "h2" | "h3";

interface MdxLinkHeadProps extends IHaveChildren {
  variant: TVariant;
}

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
    className: styles[variant],
    children: <a href={`#${id}`}>{children}</a>,
  });
};

export default MdxLinkHead;
