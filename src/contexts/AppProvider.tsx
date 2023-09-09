"use client";

import MuiConfigProvider from "./MuiConfigProvider";
import { SWRProvider } from "./SWRProvider";
import { ITree } from "@/components/Sidebar/components/Explorer";
import { IHaveChildren } from "@/models/common";
import { createContext } from "react";

export const BlogContext = createContext<ITree>({} as ITree);

interface IAppProviderProps extends IHaveChildren {
  blogs: ITree;
}

const AppProvider = ({ children, blogs }: IAppProviderProps) => {
  return (
    <SWRProvider>
      <MuiConfigProvider>
        <BlogContext.Provider value={blogs}>{children}</BlogContext.Provider>
      </MuiConfigProvider>
    </SWRProvider>
  );
};

export default AppProvider;
