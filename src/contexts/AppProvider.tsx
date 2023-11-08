"use client";

import { ITree } from "@/hooks/useExplorer";
import { IHaveChildren } from "@/models/common";
import { createContext } from "react";
import MuiConfigProvider from "./MuiConfigProvider";
import { SWRProvider } from "./SWRProvider";

export const BlogContext = createContext<ITree>({} as ITree);
export const ExplorerContext = createContext<ITree[]>([]);

interface IAppProviderProps extends IHaveChildren {
  blogs?: ITree;
  explorer: ITree[];
}

const AppProvider = ({ children, blogs, explorer }: IAppProviderProps) => {
  return (
    <SWRProvider>
      <MuiConfigProvider>
        <ExplorerContext.Provider value={explorer}>
          {/* <BlogContext.Provider value={blogs}></BlogContext.Provider> */}
          {children}
        </ExplorerContext.Provider>
      </MuiConfigProvider>
    </SWRProvider>
  );
};

export default AppProvider;
