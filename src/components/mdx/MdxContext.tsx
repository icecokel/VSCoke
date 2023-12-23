"use client";

import { TVariant } from "./MdxLinkHead";
import { IHaveChildren } from "@/models/common";
import { createContext, useState } from "react";

interface INav {
  label: string;
  type: TVariant;
}

interface IMdxContext {
  nav: INav[];
  add: (nav: INav) => void;
}

// TODO 블로그 페이지가 변경 시 nav 상태가 겹쳐집 이슈
export const mdxContext = createContext<IMdxContext>({} as IMdxContext);

const MdxProvider = ({ children }: IHaveChildren) => {
  const [nav, setNav] = useState<INav[]>([]);

  const add = (target: INav) => {
    if (nav.includes(target)) {
      return;
    }

    setNav(prev => [...prev, target]);
  };

  return <mdxContext.Provider value={{ nav, add }}>{children}</mdxContext.Provider>;
};

export default MdxProvider;
