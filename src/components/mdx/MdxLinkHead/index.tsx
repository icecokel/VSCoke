"use client";

import styles from "./style.module.css";
import { mdxContext } from "@/contexts/MdxContext";
import { usePathname } from "next/navigation";
import { ReactNode, createElement, useContext, useEffect, useRef } from "react";

export type TVariant = "h1" | "h2" | "h3";

interface MdxLinkHeadProps {
  variant: TVariant;
  children: ReactNode;
}

export const PREFIX = "link-title";

const MdxLinkHead = ({ children, variant }: MdxLinkHeadProps) => {
  const { add, stickyHead } = useContext(mdxContext);
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  const text = children?.toString();

  const id = `${PREFIX}-${text}`;

  useEffect(() => {
    add({
      title: pathname,
      items: [{ type: variant, label: text ?? "", top: ref.current?.offsetTop ?? 0 }],
    });
  }, []);

  const isSticky = stickyHead?.label === text;

  return createElement(variant, {
    id: `${id}`,
    className: styles[variant],
    style: { position: isSticky ? "sticky" : "unset" },
    ref: ref,
    children: <a href={`#${id}`}>{children}</a>,
  });
};

export default MdxLinkHead;
