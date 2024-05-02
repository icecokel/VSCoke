"use client";

import { TVariant } from "../components/mdx/MdxLinkHead";
import { IHaveChildren } from "@/models/common";
import { createContext, useEffect, useState } from "react";

interface INav {
  title: string;
  items: ILinkNav[];
}

interface ILinkNav {
  label: string;
  type: TVariant;
}

interface IMdxContext {
  nav: INav[];
  add: (nav: INav) => void;
}

export const mdxContext = createContext<IMdxContext>({} as IMdxContext);

const MdxProvider = ({ children }: IHaveChildren) => {
  const [nav, setNav] = useState<INav[]>([]);
  const add = (target: INav) => {
    setNav(prev => {
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

  return <mdxContext.Provider value={{ nav, add }}>{children}</mdxContext.Provider>;
};

export default MdxProvider;
