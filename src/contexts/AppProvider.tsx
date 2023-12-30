"use client";

import MuiConfigProvider from "./MuiConfigProvider";
import { ITree } from "@/hooks/useExplorer";
import { IHaveChildren } from "@/models/common";
import { createContext } from "react";

export const BlogContext = createContext<ITree | undefined>({} as ITree);
export const ExplorerContext = createContext<ITree[]>([]);

interface IAppProviderProps extends IHaveChildren {
  posts?: ITree;
  explorer: ITree[];
}

const AppProvider = ({ children, posts, explorer }: IAppProviderProps) => {
  return (
    <MuiConfigProvider>
      <ExplorerContext.Provider value={explorer}>
        <BlogContext.Provider value={posts}>{children}</BlogContext.Provider>
      </ExplorerContext.Provider>
    </MuiConfigProvider>
  );
};

export default AppProvider;
