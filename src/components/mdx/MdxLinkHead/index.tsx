"use client";

import styles from "./style.module.css";
import { mdxContext } from "@/contexts/MdxContext";
import { usePathname } from "next/navigation";
import { createElement, useContext, useEffect, useRef } from "react";

export type TVariant = "h1" | "h2" | "h3";

interface MdxLinkHeadProps {
  variant: TVariant;
  children: string[];
}

export const PREFIX = "link-title";

const MdxLinkHead = ({ children, variant }: MdxLinkHeadProps) => {
  const { add, stickyHead } = useContext(mdxContext);
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);

  const id = `${PREFIX}-${children[1]}`;

  useEffect(() => {
    add({
      title: pathname,
      items: [{ type: variant, label: children[1], top: ref.current?.offsetTop ?? 0 }],
    });
  }, []);

  const isSticky = stickyHead?.label === children[1];

  return createElement(variant, {
    id: `${id}`,
    className: styles[variant],
    style: { position: isSticky ? "sticky" : "unset" },
    ref: ref,
    children: <a href={`#${id}`}>{children}</a>,
  });
};

export default MdxLinkHead;
