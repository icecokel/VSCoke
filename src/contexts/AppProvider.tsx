"use client";

import { ITree } from "@/hooks/useExplorer";
import { IHaveChildren } from "@/models/common";
import SnackBarProvider from "@ui/SnackBar/context/SnackBarProvider";
import { createContext } from "react";

export const BlogContext = createContext<ITree | undefined>({} as ITree);
export const ExplorerContext = createContext<ITree[]>([]);

interface IAppProviderProps extends IHaveChildren {
  posts?: ITree;
  explorer: ITree[];
}

const AppProvider = ({ children, posts, explorer }: IAppProviderProps) => {
  return (
    <SnackBarProvider>
      <ExplorerContext.Provider value={explorer}>
        <BlogContext.Provider value={posts}>{children}</BlogContext.Provider>
      </ExplorerContext.Provider>
    </SnackBarProvider>
  );
};

export default AppProvider;
