"use client";

import styles from "./style.module.css";
import { PREFIX } from "@/components/mdx/MdxLinkHead";
import { mdxContext } from "@/contexts/MdxContext";
import { usePathname } from "next/navigation";
import { useContext } from "react";

const MdxNav = () => {
  const { nav } = useContext(mdxContext);
  const pathname = usePathname();

  const items = nav.find(({ title }) => title === pathname)?.items;
  if (!items) {
    return <></>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.nav}>
        {items.map((item, index) => {
          return (
            <a href={`#${PREFIX}-${item.label}`} key={`${item.label}_${index}`}>
              <span className={styles[item.type]}>{item.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default MdxNav;
