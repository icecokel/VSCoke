"use client";

import { TVariant } from "../components/mdx/MdxLinkHead";
import { IHaveChildren } from "@/models/common";
import { usePathname } from "next/navigation";
import { createContext, useEffect, useState } from "react";

interface INav {
  title: string;
  items: ILinkNav[];
}

interface ILinkNav {
  label: string;
  top: number;
  type: TVariant;
}

interface IMdxContext {
  nav: INav[];
  add: (nav: INav) => void;
  stickyHead?: ILinkNav;
}

export const mdxContext = createContext<IMdxContext>({} as IMdxContext);

const MdxProvider = ({ children }: IHaveChildren) => {
  const [navList, setNavList] = useState<INav[]>([]);
  const [stickyHead, setStickyHead] = useState<ILinkNav>();
  const pathname = usePathname();
  const add = (target: INav) => {
    setNavList(prev => {
      const navToUpdate = prev.find(({ title }) => title === target.title);
      if (navToUpdate) {
        return [...prev].map(item => {
          if (item.title === target.title) {
            return { ...item, items: [...navToUpdate.items, ...target.items] };
          }
          return item;
        });
      }

      return [...prev, target];
    });
  };

  const handleScroll = () => {
    const currentLinks = navList.find(({ title }) => title === pathname)?.items ?? [];
    const sortedLinks = [...currentLinks].reverse();

    const activeLink = sortedLinks.find(item => item.top < document.documentElement.scrollTop);

    setStickyHead(prev => (prev?.top !== activeLink?.top ? activeLink : prev));
  };

  useEffect(() => {
    if (navList.length > 0) {
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [navList]);

  return (
    <mdxContext.Provider value={{ nav: navList, add, stickyHead }}>{children}</mdxContext.Provider>
  );
};

export default MdxProvider;
