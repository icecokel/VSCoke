"use client";

import styles from "./style.module.css";
import { mdxContext } from "@/contexts/MdxContext";
import { usePathname } from "next/navigation";
import { createElement, useContext, useEffect } from "react";

export type TVariant = "h1" | "h2" | "h3";

interface MdxLinkHeadProps {
  variant: TVariant;
  children: string[];
}

export const PREFIX = "link-title";

const MdxLinkHead = ({ children, variant }: MdxLinkHeadProps) => {
  const { add } = useContext(mdxContext);
  const pathname = usePathname();

  const id = `${PREFIX}-${children[1]}`;

  useEffect(() => {
    add({ title: pathname, items: [{ type: variant, label: children[1] }] });
  }, []);

  return createElement(variant, {
    id: `${id}`,
    className: styles[variant],
    children: <a href={`#${id}`}>{children}</a>,
  });
};

export default MdxLinkHead;
