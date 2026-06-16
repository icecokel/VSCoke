"use client";

import { ITree } from "@/hooks/use-explorer";
import { TParentNode } from "@/models/common";
import { PostMeta } from "@/types/blog";
import SnackBarProvider from "@/components/base-ui/snack-bar/context/snack-bar-provider";
import { createContext } from "react";
import { SessionProvider } from "next-auth/react";

export const ExplorerContext = createContext<ITree[]>([]);
export const SearchPostsContext = createContext<PostMeta[]>([]);

interface IAppProviderProps extends TParentNode {
  explorer: ITree[];
  searchPosts: PostMeta[];
}

const AppProvider = ({ children, explorer, searchPosts }: IAppProviderProps) => {
  return (
    <SessionProvider>
      <SnackBarProvider>
        <ExplorerContext.Provider value={explorer}>
          <SearchPostsContext.Provider value={searchPosts}>{children}</SearchPostsContext.Provider>
        </ExplorerContext.Provider>
      </SnackBarProvider>
    </SessionProvider>
  );
};

export default AppProvider;
