"use client";

import MuiConfigProvider from "./MuiConfigProvider";
import { SWRProvider } from "./SWRProvider";
import { ITree } from "@/hooks/useExplorer";
import { IHaveChildren } from "@/models/common";
import { createContext } from "react";

export const BlogContext = createContext<ITree>({} as ITree);
export const ExplorerContext = createContext<ITree[]>([]);

interface IAppProviderProps extends IHaveChildren {
  blogs: ITree;
  explorer: ITree[];
}

const AppProvider = ({ children, blogs, explorer }: IAppProviderProps) => {
  return (
    <SWRProvider>
      <MuiConfigProvider>
        <ExplorerContext.Provider value={explorer}>
          <BlogContext.Provider value={blogs}>{children}</BlogContext.Provider>
        </ExplorerContext.Provider>
      </MuiConfigProvider>
    </SWRProvider>
  );
};

export default AppProvider;
