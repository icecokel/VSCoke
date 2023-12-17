"use client";

import { IHaveChildren } from "@/models/common";
import { createContext, useState } from "react";

interface IMdxContext {
  nav: string[];
  add: (nav: string) => void;
}

export const mdxContext = createContext<IMdxContext>({} as IMdxContext);

const MdxProvider = ({ children }: IHaveChildren) => {
  const [nav, setNav] = useState<string[]>([]);

  const add = (target: string) => {
    if (nav.includes(target)) {
      return;
    }

    setNav(prev => [...prev, target]);
  };

  return <mdxContext.Provider value={{ nav, add }}>{children}</mdxContext.Provider>;
};

export default MdxProvider;
